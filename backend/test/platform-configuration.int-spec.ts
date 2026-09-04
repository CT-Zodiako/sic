import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from '../src/auth/auth.service.ts';
import { AuditService } from '../src/audit/audit.service.ts';
import { InMemorySessionRepository } from '../src/auth/session.service.ts';
import { CompaniesService } from '../src/companies/companies.service.ts';
import { InMemoryRoleRepository, RolesService } from '../src/roles/roles.service.ts';
import { InMemoryPermissionRepository, PermissionsService } from '../src/permissions/permissions.service.ts';
import { MenuAdminService } from '../src/menu/menu.service.ts';
import { PermissionResolver } from '../src/authorization/resolver.ts';
import { createApplication } from '../src/app.ts';

function setup() {
  const user = AuthService.user('admin', 'admin@example.test', 'secret');
  const events: any[] = [];
  const audit = new AuditService({ create: async ({ data }) => { events.push(data); return data; }, findMany: async () => events });
  const recordAudit = (event: Record<string, unknown>) => audit.append(event as any);
  const companies = new CompaniesService([{ id: 'company-a', name: 'A', status: 'ACTIVE' }], [{ id: 'membership-a', userId: 'admin', companyId: 'company-a', status: 'ACTIVE' }], recordAudit);
  const roles = new RolesService(new InMemoryRoleRepository([{ id: 'role-a', name: 'Reader', scope: 'COMPANY', companyId: 'company-a', status: 'ACTIVE' }]), recordAudit);
  const permissions = new PermissionsService(new InMemoryPermissionRepository([{ id: 'permission-a', code: 'demo.read', resource: 'demo', action: 'read', status: 'ACTIVE' }]), recordAudit);
  const menuRecords = [{ id: 'menu-a', moduleId: 'module-a', name: 'Demo', status: 'ACTIVE' }];
  const menuAdmin = new MenuAdminService({
    createModule: async (data) => data, createItem: async (data) => { menuRecords.push(data as any); return data; },
    updateItem: async (id, data) => { const item = menuRecords.find(x => x.id === id); Object.assign(item!, data); return item; },
    setPermission: async (itemId, permissionId, add) => ({ itemId, permissionId, add }),
  }, recordAudit);
  const authorization = new PermissionResolver(() => ({ userId: 'admin', companyId: 'company-a', membership: { status: 'ACTIVE' }, roles: [], platformPermissions: [{ code: 'platform.admin', status: 'ACTIVE' }] }));
  const auth = new AuthService([user], { jwtSecret: 'test-secret' }, undefined, new InMemorySessionRepository());
  return { app: createApplication({ auth, audit, companies, roles, permissions, menuAdmin, authorization }), companies, roles, permissions, menuRecords, events };
}

async function context(app: ReturnType<typeof setup>['app'], email = 'admin@example.test') {
  const login = await app.handle('/v1/auth/login', { method: 'POST', body: { email, password: 'secret' } });
  return { authorization: `Bearer ${(login.body as any).accessToken}`, 'X-Company-Id': 'company-a' };
}

test('platform lifecycle PATCH endpoints mutate only allow-listed status and audit the transition', async () => {
  const fixture = setup(); const headers = await context(fixture.app);
  assert.equal((await fixture.app.handle('/v1/platform/companies/company-a', { method: 'PATCH', headers, body: { status: 'INACTIVE' } })).status, 200);
  assert.equal((await fixture.app.handle('/v1/platform/roles/role-a', { method: 'PATCH', headers, body: { status: 'INACTIVE' } })).status, 200);
  assert.equal((await fixture.app.handle('/v1/platform/permissions/permission-a', { method: 'PATCH', headers, body: { status: 'INACTIVE' } })).status, 200);
  assert.equal((await fixture.app.handle('/v1/platform/menu/items/menu-a', { method: 'PATCH', headers, body: { status: 'INACTIVE' } })).status, 200);
  assert.equal(fixture.companies.companies[0].status, 'INACTIVE');
  assert.equal(fixture.menuRecords[0].status, 'INACTIVE');
  const companyAudit = fixture.events.find(event => event.resource === 'company');
  assert.deepEqual(companyAudit.detail, { before: { status: 'ACTIVE' }, after: { status: 'INACTIVE' } });
});

test('configuration PATCH rejects non-admins and malformed fields without mutation', async () => {
  const fixture = setup();
  const user = AuthService.user('user', 'user@example.test', 'secret');
  const auth = new AuthService([user], { jwtSecret: 'test-secret' }, undefined, new InMemorySessionRepository());
  const denied = createApplication({ auth, companies: fixture.companies, authorization: new PermissionResolver(() => ({ userId: 'user', companyId: 'company-a', membership: { status: 'ACTIVE' }, roles: [], platformPermissions: [] })) });
  const headers = await context(denied, 'user@example.test');
  assert.equal((await denied.handle('/v1/platform/companies/company-a', { method: 'PATCH', headers, body: { status: 'INACTIVE' } })).status, 403);
  const adminHeaders = await context(fixture.app);
  assert.equal((await fixture.app.handle('/v1/platform/companies/company-a', { method: 'PATCH', headers: adminHeaders, body: { name: 'changed' } })).status, 400);
  assert.equal(fixture.companies.companies[0].status, 'ACTIVE');
});
