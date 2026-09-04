import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryRoleRepository, RolesService } from '../src/roles/roles.service.ts';
import { InMemoryPermissionRepository, PermissionsService } from '../src/permissions/permissions.service.ts';

class AuditedRoleRepository extends InMemoryRoleRepository {
  readonly auditEvents: Record<string, unknown>[] = [];
  override async create(data: any, audit?: Record<string, unknown>) {
    if (audit) this.auditEvents.push(audit);
    return super.create(data);
  }
}

test('RBAC rejects invalid role scopes and platform membership assignments', async () => {
  const roles = new InMemoryRoleRepository(); const service = new RolesService(roles);
  await assert.rejects(() => service.create({ name: 'bad', scope: 'PLATFORM', companyId: 'company-a' }), /Only company roles/);
  const platform = await service.create({ name: 'platform', scope: 'PLATFORM' });
  await assert.rejects(() => service.assign(platform.id, { membershipId: 'm', companyId: 'company-a' }), /Platform roles cannot/);
});

test('successful role mutation records exactly one authoritative audit event', async () => {
  const repository = new AuditedRoleRepository();
  const service = new RolesService(repository);
  await service.create({ name: 'audited', scope: 'PLATFORM' });
  assert.equal(repository.auditEvents.length, 1);
});

test('permission catalog creates and lists active grants', async () => {
  const permissions = new PermissionsService();
  const created = await permissions.create({ code: 'orders.read', resource: 'orders', action: 'read' });
  assert.deepEqual((await permissions.list()).map(p => p.code), ['orders.read']);
  assert.equal(created.resource, 'orders');
});

test('same-company role assignments and role permission changes are explicit', async () => {
  const repository = new InMemoryRoleRepository(); const roles = new RolesService(repository);
  const role = await roles.create({ name: 'reader', scope: 'COMPANY', companyId: 'company-a' });
  await roles.permission(role.id, { permissionId: 'orders.read' });
  await roles.assign(role.id, { membershipId: 'membership-a', companyId: 'company-a' });
  assert.equal(repository.links.length, 1); assert.equal(repository.assignments[0]?.companyId, 'company-a');
  await roles.permission(role.id, { permissionId: 'orders.read' }, undefined, false);
  assert.equal(repository.links.length, 0);
});

test('rejects duplicate and cross-company membership role assignments without mutation', async () => {
  const repository = new InMemoryRoleRepository();
  const roles = new RolesService(repository);
  const role = await roles.create({ name: 'reader', scope: 'COMPANY', companyId: 'company-a' });
  await roles.assign(role.id, { membershipId: 'membership-a', companyId: 'company-a' });
  await assert.rejects(() => roles.assign(role.id, { membershipId: 'membership-a', companyId: 'company-a' }), /already assigned/);
  await assert.rejects(() => roles.assign(role.id, { membershipId: 'membership-b', companyId: 'company-b' }), /match/);
  assert.equal(repository.assignments.length, 1);
});

test('shared roles can be enabled for a chosen subset of companies and reject the rest', async () => {
  const repository = new InMemoryRoleRepository();
  const roles = new RolesService(repository);
  const role = await roles.create({ name: 'Operador regional', scope: 'SHARED', companyIds: ['company-a', 'company-c'] }, 'admin') as any;
  await assert.rejects(() => roles.assign(role.id, { membershipId: 'membership-b', companyId: 'company-b' }), /not enabled for this company/);
  await roles.assign(role.id, { membershipId: 'membership-a', companyId: 'company-a' });
  assert.equal(repository.assignments.length, 1);
  const updated = await roles.setCompanies(role.id, { companyIds: ['company-b'] }, 'admin') as any;
  assert.deepEqual(updated.companyIds, ['company-b']);
  await assert.rejects(() => roles.assign(role.id, { membershipId: 'membership-a2', companyId: 'company-a' }), /not enabled for this company/);
  await roles.assign(role.id, { membershipId: 'membership-b', companyId: 'company-b' });
  await assert.rejects(() => roles.create({ name: 'Rol empresa', scope: 'COMPANY', companyId: 'company-a', companyIds: ['company-b'] }, 'admin'), /Only shared roles/);
  await assert.rejects(() => roles.setCompanies(role.id, { companyIds: 'company-a' } as any, 'admin'), /must be an array/);
});
