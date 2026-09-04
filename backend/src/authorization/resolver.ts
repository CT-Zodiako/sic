import { ApiError } from '../common/errors.ts';

export type Grant = { code: string; status?: 'ACTIVE' | 'INACTIVE'; startsAt?: Date; endsAt?: Date };
export type AuthorizationRole = { companyId?: string | null; status?: 'ACTIVE' | 'INACTIVE'; permissions: Grant[] };
export type AuthorizationState = { userId: string; companyId: string; membership: { status: 'ACTIVE' | 'INACTIVE'; startsAt?: Date; endsAt?: Date }; roles: AuthorizationRole[]; platformPermissions?: Grant[] };
export type PolicyMode = 'ANY' | 'ALL';
export type PermissionOptions = { allowPlatform?: boolean; now?: Date };
export type AuthorizationRepository = { load(userId: string, companyId: string): Promise<AuthorizationState | undefined>; platform?(userId: string): Promise<Grant[]> };
export type AuthorizationDelegate = {
  findUnique(args: { where: Record<string, unknown>; include: Record<string, unknown> }): Promise<any>;
  findMany(args: { where: Record<string, unknown>; include: Record<string, unknown> }): Promise<any[]>;
};
export class PrismaAuthorizationRepository implements AuthorizationRepository {
  private readonly membership: AuthorizationDelegate;
  private readonly role: AuthorizationDelegate;
  private readonly platformAssignment?: AuthorizationDelegate;
  constructor(membership: AuthorizationDelegate, role: AuthorizationDelegate, platformAssignment?: AuthorizationDelegate) { this.membership = membership; this.role = role; this.platformAssignment = platformAssignment; }
  async platform(userId: string) {
    const rows = await (this.platformAssignment?.findMany({ where: { userId }, include: { role: { include: { permissions: { include: { permission: true } } } } } }) ?? Promise.resolve([]));
    return rows.flatMap((link: any) => link.role?.scope === 'PLATFORM' && link.role.status === 'ACTIVE' ? (link.role.permissions ?? []).filter((entry: any) => entry.permission?.status !== 'INACTIVE').map((entry: any) => ({ code: String(entry.permission.code), status: entry.permission.status })) : []);
  }
  async load(userId: string, companyId: string) {
    const [membership, platformRoles, assignments] = await Promise.all([
      this.membership.findUnique({ where: { userId_companyId: { userId, companyId } }, include: { roles: { include: { role: { include: { permissions: { include: { permission: true } }, companies: true } } } } } }),
      this.role.findMany({ where: { scope: 'PLATFORM', status: 'ACTIVE' }, include: { permissions: { include: { permission: true } } } }),
      this.platformAssignment?.findMany({ where: { userId }, include: { role: { include: { permissions: { include: { permission: true } } } } } }),
    ]);
    if (!membership) return undefined;
    const grants = (links: any[]) => links.flatMap(link => (link.role?.permissions ?? link.permissions ?? []).filter((entry: any) => entry.permission?.status !== 'INACTIVE').map((entry: any) => ({ code: String(entry.permission.code), status: entry.permission.status })));
    const effectivePlatformRoles = this.platformAssignment ? (assignments ?? []).map((link: any) => link.role).filter((role: any) => role?.scope === 'PLATFORM' && role.status === 'ACTIVE') : platformRoles;
    // Fail-closed eligibility: a shared role only grants inside companies where it is enabled.
    const eligibleRoles = (membership.roles ?? []).filter((link: any) => {
      const role = link.role;
      if (role.scope !== 'SHARED') return true;
      const enabled = role.companies ?? [];
      return enabled.length === 0 || enabled.some((entry: any) => entry.companyId === companyId);
    });
    return { userId, companyId, membership: { status: membership.status, startsAt: membership.startsAt, endsAt: membership.endsAt }, roles: eligibleRoles.map((link: any) => ({ companyId, status: link.role.status, permissions: grants([link]) })), platformPermissions: grants(effectivePlatformRoles) };
  }
}

function active(grant: Grant, now: Date) { return grant.status !== 'INACTIVE' && (!grant.startsAt || grant.startsAt <= now) && (!grant.endsAt || grant.endsAt > now); }

export class PermissionResolver {
  private readonly load: (userId: string, companyId: string) => AuthorizationState | Promise<AuthorizationState | undefined> | undefined;
  private readonly platform: ((userId: string) => Grant[] | Promise<Grant[]>) | undefined;
  constructor(load: ((userId: string, companyId: string) => AuthorizationState | Promise<AuthorizationState | undefined> | undefined) | AuthorizationRepository) {
    this.load = typeof load === 'function' ? load : (userId, companyId) => load.load(userId, companyId);
    this.platform = typeof load === 'function' ? undefined : load.platform?.bind(load);
  }
  async canPlatformAsync(userId: string, required: string | string[], mode: PolicyMode = 'ANY', now = new Date()) {
    if (!this.platform) {
      // Platform grants are company-independent: verify identity and active
      // membership, then evaluate only the platform grant list.
      const state = await this.load(userId, '');
      if (!state || state.userId !== userId || !active(state.membership, now)) return false;
      const codes = new Set((state.platformPermissions ?? []).filter(grant => active(grant, now)).map(grant => grant.code));
      const needed = Array.isArray(required) ? required : [required];
      return mode === 'ALL' ? needed.every(code => codes.has(code)) : needed.some(code => codes.has(code));
    }
    const grants = await this.platform(userId);
    const codes = new Set(grants.filter(grant => active(grant, now)).map(grant => grant.code));
    const needed = Array.isArray(required) ? required : [required];
    return mode === 'ALL' ? needed.every(code => codes.has(code)) : needed.some(code => codes.has(code));
  }
  async permissionsAsync(userId: string, companyId: string, options: PermissionOptions = {}) {
    const state = await this.load(userId, companyId);
    if (!state || state.userId !== userId || state.companyId !== companyId || !active(state.membership, options.now ?? new Date())) return [];
    const codes = new Set<string>();
    for (const role of state.roles) if (role.companyId === companyId && role.status !== 'INACTIVE') for (const grant of role.permissions) if (active(grant, options.now ?? new Date())) codes.add(grant.code);
    if (options.allowPlatform) for (const grant of state.platformPermissions ?? []) if (active(grant, options.now ?? new Date())) codes.add(grant.code);
    return [...codes].sort();
  }

  async canAsync(userId: string, companyId: string, required: string | string[], mode: PolicyMode = 'ANY', options: PermissionOptions = {}) {
    const state = await this.load(userId, companyId);
    return this.evaluate(state, userId, companyId, required, mode, options);
  }
  can(userId: string, companyId: string, required: string | string[], mode: PolicyMode = 'ANY', options: PermissionOptions = {}) {
    const state = this.load(userId, companyId);
    if (state && typeof (state as Promise<unknown>).then === 'function') return (state as Promise<AuthorizationState | undefined>).then(value => this.evaluate(value, userId, companyId, required, mode, options));
    return this.evaluate(state as AuthorizationState | undefined, userId, companyId, required, mode, options);
  }
  private evaluate(state: AuthorizationState | undefined, userId: string, companyId: string, required: string | string[], mode: PolicyMode, options: PermissionOptions) {
    if (!state || state.userId !== userId || state.companyId !== companyId || !active(state.membership, options.now ?? new Date())) return false;
    const codes = new Set<string>();
    for (const role of state.roles) if (role.companyId === companyId && role.status !== 'INACTIVE') for (const grant of role.permissions) if (active(grant, options.now ?? new Date())) codes.add(grant.code);
    if (options.allowPlatform) for (const grant of state.platformPermissions ?? []) if (active(grant, options.now ?? new Date())) codes.add(grant.code);
    const needed = Array.isArray(required) ? required : [required];
    return mode === 'ALL' ? needed.every(code => codes.has(code)) : needed.some(code => codes.has(code));
  }
}

export function requirePermission(result: boolean | PromiseLike<boolean>): void | Promise<void> { if (result && (typeof result === 'object' || typeof result === 'function') && typeof result.then === 'function') return Promise.resolve(result).then(ok => { if (!ok) throw new ApiError(403, 'PERMISSION_DENIED', 'You do not have permission.'); }); if (!result) throw new ApiError(403, 'PERMISSION_DENIED', 'You do not have permission.'); }
