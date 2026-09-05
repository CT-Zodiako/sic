import { HttpContext, request, type HttpHandler, type HttpResponse } from '../../core/http';

export type Page<T> = { items: T[]; page: number; pageSize: number; total: number };
export type AdminUser = { id: string; email: string; name: string; status?: 'ACTIVE' | 'INACTIVE' };
export type AdminCompany = { id: string; name: string; taxId?: string; status?: 'ACTIVE' | 'INACTIVE' };
export type Membership = { id: string; userId: string; companyId: string; status?: 'ACTIVE' | 'INACTIVE'; roles?: string[]; roleDetails?: Array<{ id: string; name: string }> };
export type Role = { id: string; name: string; description?: string; scope: 'PLATFORM' | 'SHARED' | 'COMPANY'; companyId?: string | null; status?: 'ACTIVE' | 'INACTIVE'; companyIds?: string[]; permissions?: string[] };
export type Permission = { id: string; code: string; resource: string; action: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' };
export type Service = { id: string; code: string; name: string; description?: string; status?: 'ACTIVE' | 'INACTIVE' };
export type ServiceAssignment = { id: string; companyId: string; companyName: string; serviceId: string; serviceCode: string; serviceName: string; status?: 'ACTIVE' | 'INACTIVE' };
export type MenuItem = { id: string; name: string; moduleId?: string; parentId?: string | null; route?: string | null; sortOrder?: number; permissionMode?: 'ANY' | 'ALL'; status?: 'ACTIVE' | 'INACTIVE'; permissions?: string[] };
export type PlatformTransport = Pick<HttpHandler, 'handle'>;
export type ApiProblem = { code?: string; detail?: string; message?: string; status?: number };

const json = async <T>(response: HttpResponse<T>): Promise<T> => {
  if (response.body === undefined) throw new Error('Empty API response.');
  return response.body;
};
const path = (value: string) => encodeURIComponent(value);

export class PlatformAdminApiClient {
  private readonly transport: PlatformTransport;
  constructor(transport: PlatformTransport) { this.transport = transport; }
  private async send<T>(url: string, body?: unknown, method?: string) {
    const verb = method ?? (body === undefined ? 'GET' : 'POST');
    return json<T>(await this.transport.handle(request(verb, `/v1/platform${url}`, new HttpContext(), {}, body) as any) as HttpResponse<T>);
  }
  users(page = 1) { return this.send<Page<AdminUser>>(`/users?page=${page}`); }
  createUser(input: { email: string; name: string; password: string }) { return this.send<AdminUser>('/users', input); }
  updateUser(id: string, input: Record<string, unknown>) { return this.send<AdminUser>(`/users/${path(id)}`, input, 'PATCH'); }
  companies(page = 1) { return this.send<Page<AdminCompany>>(`/companies?page=${page}`); }
  createCompany(input: { name: string; taxId?: string }) { return this.send<AdminCompany>('/companies', input); }
  updateCompany(id: string, input: Record<string, unknown>) { return this.send<AdminCompany>(`/companies/${path(id)}`, input, 'PATCH'); }
  memberships(page = 1) { return this.send<Page<Membership>>(`/memberships?page=${page}`); }
  createMembership(input: { userId: string; companyId: string; startsAt?: string; endsAt?: string }) { return this.send<Membership>('/memberships', input); }
  deactivateMembership(id: string) { return this.send<Membership>(`/memberships/${path(id)}`, { status: 'INACTIVE' }, 'PATCH'); }
  roles(companyId?: string) { return this.send<Role[]>(companyId ? `/roles?companyId=${path(companyId)}` : '/roles'); }
  updateRole(id: string, input: Record<string, unknown>) { return this.send<Role>(`/roles/${path(id)}`, input, 'PATCH'); }
  createRole(input: { name: string; description?: string; scope: Role['scope']; companyId?: string; companyIds?: string[] }) { return this.send<Role>('/roles', input); }
  addRolePermission(roleId: string, permissionId: string) { return this.send<unknown>(`/roles/${path(roleId)}/permissions`, { permissionId }); }
  removeRolePermission(roleId: string, permissionId: string) { return this.send<unknown>(`/roles/${path(roleId)}/permissions/${path(permissionId)}`, undefined, 'DELETE'); }
  removeRoleAssignment(roleId: string, membershipId: string) { return this.send<unknown>(`/roles/${path(roleId)}/assignments`, { membershipId }, 'DELETE'); }
  assignRole(roleId: string, input: { membershipId: string; companyId: string }) { return this.send<unknown>(`/roles/${path(roleId)}/assignments`, input); }
  permissions() { return this.send<Permission[]>('/permissions'); }
  createPermission(input: { code: string; resource: string; action: string; description?: string }) { return this.send<Permission>('/permissions', input); }
  updatePermission(id: string, input: Record<string, unknown>) { return this.send<Permission>(`/permissions/${path(id)}`, input, 'PATCH'); }
  menu() { return this.send<MenuItem[]>('/menu'); }
  services() { return this.send<Service[]>('/services'); }
  createService(input: { code: string; name: string; description?: string }) { return this.send<Service>('/services', input); }
  updateService(id: string, input: Record<string, unknown>) { return this.send<Service>(`/services/${path(id)}`, input, 'PATCH'); }
  serviceAssignments() { return this.send<ServiceAssignment[]>('/company-services'); }
  assignService(input: { companyId: string; serviceId: string }) { return this.send<ServiceAssignment>('/company-services', input); }
  updateServiceAssignment(id: string, input: Record<string, unknown>) { return this.send<ServiceAssignment>(`/company-services/${path(id)}`, input, 'PATCH'); }
  createMenuItem(input: Record<string, unknown>) { return this.send<MenuItem>('/menu/items', input); }
  updateMenuItem(id: string, input: Record<string, unknown>) { return this.send<MenuItem>(`/menu/items/${path(id)}`, input, 'PATCH'); }
  auditEvents(filter: Record<string, unknown> = {}) { const query = new URLSearchParams(filter as Record<string, string>).toString(); return this.send<unknown[]>(`/audit-events${query ? `?${query}` : ''}`); }
  addMenuPermission(itemId: string, permissionId: string) { return this.send<unknown>(`/menu/items/${path(itemId)}/permissions`, { permissionId }); }
  removeMenuPermission(itemId: string, permissionId: string) { return this.send<unknown>(`/menu/items/${path(itemId)}/permissions/${path(permissionId)}`, { permissionId }, 'DELETE'); }
}

/** Keep request payloads deliberately small and reject mass-assignment in the UI as well as on the API. */
export const validateFields = (values: Record<string, unknown>, required: readonly string[]) => {
  const errors: Record<string, string> = {};
  for (const field of required) if (typeof values[field] !== 'string' || !String(values[field]).trim()) errors[field] = field === 'route' ? 'La ruta es obligatoria.' : `${fieldLabel(field)} es obligatorio.`;
  const email = values['email'];
  if (typeof email === 'string' && email.trim() && !/^\S+@\S+\.\S+$/.test(email)) errors['email'] = 'El correo electrónico no es válido.';
  return errors;
};

const fieldLabel = (field: string) => ({ email: 'El correo electrónico', name: 'El nombre', password: 'La contraseña', userId: 'La persona', companyId: 'La empresa', code: 'El código', resource: 'El recurso', action: 'La acción', roleId: 'El rol', membershipId: 'La asignación', permissionId: 'El permiso', moduleId: 'El módulo', route: 'La ruta' } as Record<string, string>)[field] ?? field;

export const problemMessage = (error: unknown) => {
  const problem = (error as { error?: ApiProblem })?.error;
  if (problem?.code === 'VALIDATION_ERROR') return problem.detail ?? problem.message ?? 'Revisa los campos marcados.';
  if (problem?.code === 'SERVICE_NOT_ENABLED') return 'Este servicio no está habilitado para la empresa activa.';
  if ((error as { status?: number })?.status === 403) return 'No tienes permiso para realizar esta acción.';
  if ((error as { status?: number })?.status === 404) return 'El recurso solicitado ya no está disponible.';
  return 'No se pudo completar la operación.';
};
