import { ApiError, problem, problemFromError } from './common/errors.ts';
import { requestId } from './common/request.ts';
import { AuthService, type AuthConfig, type AuthUser } from './auth/auth.service.ts';
import { type SessionRepository } from './auth/session.service.ts';
import { AuditService } from './audit/audit.service.ts';
import { tenantContextFromRequest, TenantContext } from './tenancy/context.ts';
import { CompaniesService } from './companies/companies.service.ts';
import { MenuService, MenuAdminService } from './menu/menu.service.ts';
import { PermissionResolver } from './authorization/resolver.ts';
    import { UsersService } from './users/users.service.ts';
    import { validateCompanyConsistency } from './tenancy/context.ts';
    import { RolesService } from './roles/roles.service.ts';
    import { PermissionsService } from './permissions/permissions.service.ts';
    import { OperationalDemoService } from './operational-demo/operational-demo.service.ts';
    import { ServicesService } from './services/services.service.ts';

export type ApiResponse = { status: number; body: unknown; headers?: Record<string, string> };
export type RequestOptions = { method?: string; headers?: Record<string, string | string[] | undefined>; body?: unknown };
export type ApplicationOptions = { auth?: AuthService; audit?: AuditService; users?: AuthUser[]; usersService?: UsersService; authConfig?: AuthConfig; sessionRepository?: SessionRepository; companies?: CompaniesService; menu?: MenuService; menuAdmin?: MenuAdminService; roles?: RolesService; permissions?: PermissionsService; authorization?: PermissionResolver; operationalDemo?: OperationalDemoService; services?: ServicesService };

const HEALTH_PATH = '/v1/health';
const REPRESENTATIVE_PROBLEMS: Record<string, { status: number; code: string; detail: string }> = {
  '/v1/missing-400': { status: 400, code: 'VALIDATION_ERROR', detail: 'The request is invalid.' },
  '/v1/missing-401': { status: 401, code: 'UNAUTHENTICATED', detail: 'Authentication is required.' },
  '/v1/missing-403': { status: 403, code: 'PERMISSION_DENIED', detail: 'You do not have permission to perform this request.' },
  '/v1/missing-404': { status: 404, code: 'RESOURCE_NOT_FOUND', detail: 'The requested resource was not found.' },
  '/v1/missing-409': { status: 409, code: 'DUPLICATE_RESOURCE', detail: 'The requested resource conflicts with an existing resource.' },
};

export class Application {
  private authInstance?: AuthService;
  private readonly audit?: AuditService;
  private readonly users: AuthUser[];
  private readonly authConfig: AuthConfig;
  private readonly sessionRepository?: SessionRepository;
  private readonly companies?: CompaniesService;
  private readonly usersService: UsersService;
  private readonly menu?: MenuService;
  private readonly menuAdmin?: MenuAdminService;
  private readonly roles?: RolesService;
  private readonly permissions?: PermissionsService;
  private readonly authorization?: PermissionResolver;
  private readonly operationalDemo?: OperationalDemoService;
  private readonly services?: ServicesService;

  constructor(options: ApplicationOptions | AuthService = {}) {
    const composition = options instanceof AuthService ? { auth: options } : options;
    this.authInstance = composition.auth; this.audit = composition.audit;
    this.users = composition.users ?? []; this.authConfig = composition.authConfig ?? {};
    this.sessionRepository = composition.sessionRepository;
    this.companies = composition.companies; this.usersService = composition.usersService ?? new UsersService(this.users, undefined, this.audit ? async (event) => { await this.audit!.append(event as any); } : undefined); this.menu = composition.menu; this.menuAdmin = composition.menuAdmin; this.roles = composition.roles; this.permissions = composition.permissions; this.authorization = composition.authorization; this.operationalDemo = composition.operationalDemo; this.services = composition.services;
  }

  get auth(): AuthService {
    if (!this.authInstance) {
      if (!this.sessionRepository) throw new Error('SESSION_REPOSITORY_REQUIRED');
      this.authInstance = new AuthService(this.users, this.authConfig, this.audit ? (event) => { void void this.audit!.append(event as any); } : undefined, this.sessionRepository);
    }
    return this.authInstance;
  }

  get(path: string): ApiResponse {
    if (path !== HEALTH_PATH) return { status: 404, body: { status: 'not_found' } };
    return { status: 200, body: { status: 'ok' } };
  }

  async handle(path: string, options: RequestOptions = {}): Promise<ApiResponse> {
    const id = requestId(options.headers?.['x-request-id'] ?? options.headers?.['X-Request-Id']);
    const headers: Record<string, string> = { 'x-request-id': id, 'content-type': 'application/json' };
    if (path === HEALTH_PATH && (options.method ?? 'GET') === 'GET') return { status: 200, body: { status: 'ok' }, headers };
    try {
      const method = options.method ?? 'GET';
      const body = (options.body && typeof options.body === 'object') ? options.body as Record<string, unknown> : {};
      const authorization = options.headers?.authorization ?? options.headers?.Authorization;
      const cookie = options.headers?.cookie ?? options.headers?.Cookie;
      const refresh = typeof cookie === 'string' ? cookie.match(/(?:^|;\s*)sic_refresh=([^;]+)/)?.[1] : undefined;
      if (path === '/v1/auth/login' && method === 'POST') {
        const result = await this.auth.login(String(body.email ?? ''), String(body.password ?? ''));
        headers['set-cookie'] = this.refreshCookie(result.token);
        return { status: 200, body: { accessToken: result.accessToken, user: result.user }, headers };
      }
      if (path === '/v1/auth/refresh' && method === 'POST') {
        const result = await this.auth.refresh(refresh ?? String(body.refreshToken ?? ''));
        headers['set-cookie'] = this.refreshCookie(result.token);
        return { status: 200, body: { accessToken: result.accessToken }, headers };
      }
      if (path === '/v1/auth/logout' && method === 'POST') {
        const result = await this.auth.logout(this.bearer(authorization));
        headers['set-cookie'] = `sic_refresh=; Path=/v1/auth; HttpOnly${process.env.NODE_ENV === 'production' ? '; Secure' : ''}; SameSite=Strict; Max-Age=0`;
        return { status: 200, body: result, headers };
      }
      if (path === '/v1/auth/me' && method === 'GET') return { status: 200, body: await this.auth.me(this.bearer(authorization)), headers };
      if (path.startsWith('/v1/companies/') && path.includes('/operational-demo-records')) {
        const claims = await this.auth.authenticate(this.bearer(authorization));
        if (!this.operationalDemo || !this.authorization) throw new ApiError(503, 'CONTEXT_UNAVAILABLE', 'Operational demo is unavailable.');
        const parts = path.split('/').filter(Boolean); const companyId = parts[2]; const recordId = parts[4]; const isAction = parts[5] === 'actions';
        const rawHeaders = Object.fromEntries(Object.entries(options.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
        const serviceCode = typeof rawHeaders['x-service-code'] === 'string' && String(rawHeaders['x-service-code']).trim() ? String(rawHeaders['x-service-code']).trim() : undefined;
        const tenantBase = tenantContextFromRequest(claims.sub, rawHeaders, { ...body, companyId });
        const tenant = new TenantContext({ userId: tenantBase.userId, companyId: tenantBase.companyId, membershipId: tenantBase.membershipId, serviceCode });
        const permission = isAction ? 'operational-demo.action' : method === 'GET' ? 'operational-demo.read' : method === 'POST' ? 'operational-demo.create' : method === 'DELETE' ? 'operational-demo.delete' : 'operational-demo.update';
        const platformOverride = await this.authorization.canAsync(claims.sub, tenant.companyId, 'platform.admin', 'ANY', { allowPlatform: true });
        if (!await this.authorization.canAsync(claims.sub, tenant.companyId, permission, 'ANY', { allowPlatform: platformOverride })) {
          await this.audit?.append({ userId: claims.sub, companyId: tenant.companyId, resource: 'operational-demo-record', action: 'authorize', recordId, result: 'DENIED', detail: { permission, reasonCode: 'PERMISSION_DENIED' } } as any);
          throw new ApiError(403, 'PERMISSION_DENIED', 'You do not have permission.');
        }
        if (serviceCode && this.services) {
          const enabled = await this.services.listEnabled(tenant.companyId);
          if (!enabled.some(service => service.code === serviceCode)) {
            await this.audit?.append({ userId: claims.sub, companyId: tenant.companyId, resource: 'operational-demo-record', action: 'authorize', recordId, result: 'DENIED', detail: { serviceCode, reasonCode: 'SERVICE_NOT_ENABLED' } } as any);
            throw new ApiError(403, 'SERVICE_NOT_ENABLED', 'The service is not enabled for this company.');
          }
        }
        if (platformOverride) await this.audit?.append({ userId: claims.sub, companyId: tenant.companyId, resource: 'operational-demo-record', action: 'privileged-access', recordId, result: 'SUCCESS', detail: { permission, platformOverride: true } } as any);
        if (method === 'GET' && !recordId) return { status: 200, body: await this.operationalDemo.list(tenant), headers };
        if (method === 'GET' && recordId) return { status: 200, body: await this.operationalDemo.detail(tenant, recordId), headers };
        if (method === 'POST' && !recordId) return { status: 201, body: await this.operationalDemo.create(tenant, body), headers };
        if (isAction && method === 'POST') return { status: 200, body: await this.operationalDemo.action(tenant, recordId, body.action), headers };
        if (method === 'PATCH' && recordId) return { status: 200, body: await this.operationalDemo.update(tenant, recordId, body), headers };
        if (method === 'DELETE' && recordId) return { status: 200, body: await this.operationalDemo.remove(tenant, recordId), headers };
        throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'The requested resource was not found.');
      }
      if (path.startsWith('/v1/platform/')) {
        const claims = await this.auth.authenticate(this.bearer(authorization));
        const companyId = await this.requirePlatformAdmin(claims.sub, options.headers, body);
        const parts = path.split('/').filter(Boolean); const resource = parts[2]; const id = parts[3];
        if (resource === 'audit-events' && method === 'GET' && this.audit) {
          return { status: 200, body: await this.audit.read({ ...body, ...auditQuery(path) } as any), headers };
        }
        if (resource === 'menu' && method === 'GET' && this.menu) {
          return { status: 200, body: await this.menu.list(), headers };
        }
        if (resource === 'roles' && this.roles) {
          if (method === 'GET' && !id) return { status: 200, body: await this.roles.list(companyId), headers };
          if (method === 'PATCH' && id && !parts[4]) return { status: 200, body: await this.roles.update(id, body, claims.sub), headers };
          if (method === 'POST' && !id) return { status: 201, body: await this.roles.create(body, claims.sub), headers };
          if (id && parts[4] === 'permissions') {
            // DELETE removes by URL id; POST adds from the body.
            if (method === 'DELETE' && parts[5]) return { status: 200, body: await this.roles.permission(id, { permissionId: parts[5] }, claims.sub, false), headers };
            if (method !== 'DELETE') return { status: 200, body: await this.roles.permission(id, body, claims.sub, true), headers };
          }
          if (id && parts[4] === 'platform-assignments') return { status: 200, body: await this.roles.assignPlatform(id, body, claims.sub), headers };
          if (id && parts[4] === 'companies' && (method === 'PUT' || method === 'POST')) return { status: 200, body: await this.roles.setCompanies(id, body, claims.sub), headers };
        if (id && parts[4] === 'assignments') { if (method === 'DELETE') return { status: 200, body: await this.roles.unassign(id, body.membershipId ?? body.id, claims.sub), headers }; return { status: 200, body: await this.roles.assign(id, body, claims.sub), headers }; }
        }
        if (resource === 'permissions' && this.permissions) {
          if (method === 'PATCH' && id) return { status: 200, body: await this.permissions.update(id, body, claims.sub), headers };
          if (method === 'GET') return { status: 200, body: await this.permissions.list(), headers };
          if (method === 'POST') return { status: 201, body: await this.permissions.create(body, claims.sub), headers };
        }
        if (resource === 'menu' && this.menuAdmin) {
          if (method === 'POST' && id === 'modules') return { status: 201, body: await this.menuAdmin.createModule(body, claims.sub), headers };
          if (id === 'items' && parts[4] && parts[5] === 'permissions') return { status: 200, body: await this.menuAdmin.permission(parts[4], body, claims.sub, method !== 'DELETE'), headers };
          if (method === 'POST' && id === 'items' && !parts[4]) return { status: 201, body: await this.menuAdmin.createItem(body, claims.sub), headers };
          if (id === 'items' && parts[4] && method === 'PATCH') return { status: 200, body: await this.menuAdmin.updateItem(parts[4], body, claims.sub), headers };
        }
        if (resource === 'users') {
          if (method === 'GET' && !id) return { status: 200, body: await this.usersService.list(body), headers };
          if (method === 'POST' && !id) return { status: 201, body: await this.usersService.create(body, claims.sub), headers };
          if (method === 'PATCH' && id) return { status: 200, body: await this.usersService.update(id, body, claims.sub), headers };
        }
        if (resource === 'companies' && this.companies) {
          if (method === 'PATCH' && id) return { status: 200, body: await this.companies.update(id, body, claims.sub), headers };
          if (method === 'GET' && !id) return { status: 200, body: await this.companies.list(body), headers };
          if (method === 'POST' && !id) return { status: 201, body: await this.companies.create(body, claims.sub), headers };
        }
        if (resource === 'memberships' && this.companies) {
          if (method === 'GET' && !id) return { status: 200, body: await this.companies.listMemberships(body), headers };
          if (method === 'POST' && !id) return { status: 201, body: await this.companies.establishMembership(body, claims.sub), headers };
          if ((method === 'DELETE' || method === 'POST' || method === 'PATCH') && id) return { status: 200, body: await this.companies.deactivateMembership(id, claims.sub), headers };
        }
        if (resource === 'services' && this.services) {
          if (method === 'GET' && !id) return { status: 200, body: await this.services.list(), headers };
          if (method === 'POST' && !id) return { status: 201, body: await this.services.create(body, claims.sub), headers };
          if (method === 'PATCH' && id) return { status: 200, body: await this.services.setStatus(id, body, claims.sub), headers };
        }
        if (resource === 'company-services' && this.services) {
          if (method === 'GET' && !id) return { status: 200, body: await this.services.listAssignments(), headers };
          if (method === 'POST' && !id) return { status: 201, body: await this.services.assign(body, claims.sub), headers };
          if (method === 'PATCH' && id) return { status: 200, body: await this.services.setAssignmentStatus(id, body, claims.sub), headers };
        }
        throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'The requested resource was not found.');
      }
      if (path === '/v1/me/companies' && method === 'GET') {
        const claims = await this.auth.authenticate(this.bearer(authorization));
        if (!this.companies) throw new ApiError(503, 'CONTEXT_UNAVAILABLE', 'Company context is unavailable.');
        return { status: 200, body: { companies: await this.companies.listActive(claims.sub) }, headers };
      }
      if (path === '/v1/me/active-company' && method === 'PUT') {
        const claims = await this.auth.authenticate(this.bearer(authorization));
        if (!this.companies) throw new ApiError(503, 'CONTEXT_UNAVAILABLE', 'Company context is unavailable.');
        return { status: 200, body: await this.companies.select(claims.sub, body.companyId), headers };
      }
      if (path === '/v1/me/authorization-context' && method === 'GET') {
        const claims = await this.auth.authenticate(this.bearer(authorization));
        if (!this.companies || !this.authorization || !this.menu) throw new ApiError(503, 'CONTEXT_UNAVAILABLE', 'Authorization context is unavailable.');
        const rawHeaders = Object.fromEntries(Object.entries(options.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
        // Platform mode: a platform.admin user gets the platform menu without any company.
        if (rawHeaders['x-company-id'] === undefined) {
          const isPlatform = await this.authorization.canPlatformAsync(claims.sub, 'platform.admin');
          if (isPlatform) {
            const platformPermissions = await this.authorization.platformGrants(claims.sub);
            const codes = new Set<string>(platformPermissions.filter(grant => grant.status !== 'INACTIVE').map(grant => String(grant.code)));
            const menuItems = await this.menu.list();
            return { status: 200, body: { company: null, permissions: [...codes].sort(), menu: this.menu.filter(codes, menuItems), services: [] }, headers };
          }
        }
        const tenant = tenantContextFromRequest(claims.sub, rawHeaders, body);
        const company = await this.companies.context(claims.sub, tenant.companyId);
        const permissions = new Set(await this.authorization.permissionsAsync(claims.sub, tenant.companyId, { allowPlatform: true }));
        const menuItems = await this.menu.list();
        // Membership verification above establishes the tenant boundary. A valid
        // member may have no grants; in that case the effective context is empty.
        const enabledServices = this.services ? await this.services.listEnabled(tenant.companyId) : [];
        const serviceMenu = permissions.has('operational-demo.read')
          ? enabledServices.map((service, index) => ({ id: `service-${service.code}`, label: service.name, route: `/operational-demo?service=${service.code}`, navigable: true, children: [], sortOrder: 100 + index }))
          : [];
        return { status: 200, body: { company, permissions: [...permissions].sort(), menu: [...this.menu.filter(permissions, menuItems), ...serviceMenu], services: enabledServices }, headers };
      }
      if (path === '/v1/tenant/context' && method === 'GET') {
        const claims = await this.auth.authenticate(this.bearer(authorization));
        const rawHeaders = Object.fromEntries(Object.entries(options.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
        const context = tenantContextFromRequest(claims.sub, rawHeaders, body);
        return { status: 200, body: { userId: context.userId, companyId: context.companyId, membershipId: context.membershipId }, headers };
      }
    } catch (error) {
      const apiError = error instanceof ApiError ? error : undefined;
      return { status: apiError?.status ?? 500, body: problemFromError(error, id), headers };
    }
    const mappedProblem = REPRESENTATIVE_PROBLEMS[path];
    if (mappedProblem) return { headers, status: mappedProblem.status, body: problem(mappedProblem.status, mappedProblem.code, mappedProblem.detail, id) };
    return { status: 404, body: problem(404, 'RESOURCE_NOT_FOUND', 'The requested resource was not found.', id), headers };
  }

  private async requirePlatformAdmin(userId: string, headers: RequestOptions['headers'] = {}, body: Record<string, unknown> = {}) {
    if (!this.authorization) throw new ApiError(503, 'CONTEXT_UNAVAILABLE', 'Authorization is unavailable.');
    const normalized = Object.fromEntries(Object.entries(headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]));
    let companyId: string | undefined;
    try { companyId = normalized['x-company-id'] === undefined ? undefined : validateCompanyConsistency(normalized['x-company-id'], body); } catch (error) { await this.audit?.append({ userId, resource: 'platform-administration', action: 'authorize', result: 'DENIED', detail: { reasonCode: error instanceof ApiError ? error.code : 'CONTEXT_INVALID' } } as any); throw error; }
    const allowed = companyId === undefined ? await this.authorization.canPlatformAsync(userId, 'platform.admin') : await this.authorization.canAsync(userId, companyId, 'platform.admin', 'ANY', { allowPlatform: true });
    if (!allowed) { await this.audit?.append({ userId, companyId, resource: 'platform-administration', action: 'authorize', result: 'DENIED', detail: { permission: 'platform.admin' } } as any); throw new ApiError(403, 'PERMISSION_DENIED', 'You do not have permission.'); }
    return companyId ?? '';
  }
  private bearer(value: string | string[] | undefined) { return Array.isArray(value) ? value[0] ?? '' : value ?? ''; }
  private refreshCookie(token: string) { const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''; return `sic_refresh=${token}; Path=/v1/auth; HttpOnly${secure}; SameSite=Strict; Max-Age=2592000`; }
}

function auditQuery(path: string): Record<string, unknown> {
  const query = path.includes('?') ? new URL(path, 'http://localhost').searchParams : new URLSearchParams();
  const result: Record<string, unknown> = {};
  for (const key of ['userId', 'companyId', 'resource', 'action', 'result']) {
    const value = query.get(key); if (value !== null) result[key] = value;
  }
  for (const key of ['take', 'skip']) {
    const value = query.get(key); if (value !== null && /^\d+$/.test(value)) result[key] = Number(value);
  }
  return result;
}

export const createApplication = (options: ApplicationOptions | AuthService = {}, audit?: AuditService) => new Application(options instanceof AuthService ? { auth: options, audit } : options);
