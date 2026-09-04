import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from '../src/auth/auth.service.ts';
import { AuditService } from '../src/audit/audit.service.ts';
import { InMemorySessionRepository } from '../src/auth/session.service.ts';
import { CompaniesService } from '../src/companies/companies.service.ts';
import { MenuService } from '../src/menu/menu.service.ts';
import { PermissionResolver } from '../src/authorization/resolver.ts';
import { InMemoryServiceRepository, ServicesService } from '../src/services/services.service.ts';
import { InMemoryOperationalDemoRepository, OperationalDemoService } from '../src/operational-demo/operational-demo.service.ts';
import { createApplication, type Application } from '../src/app.ts';

const companyFixtures = [
  { id: 'company-a', name: 'Empresa A', status: 'ACTIVE' as const },
  { id: 'company-b', name: 'Empresa B', status: 'ACTIVE' as const },
  { id: 'company-c', name: 'Empresa C', status: 'INACTIVE' as const },
];
const serviceFixtures = [
  { id: 'svc-water', code: 'acueducto', name: 'Acueducto', description: 'Gestión del servicio de acueducto.', status: 'ACTIVE' as const },
  { id: 'svc-energy', code: 'energia', name: 'Energía', status: 'ACTIVE' as const },
  { id: 'svc-gas', code: 'gas', name: 'Gas', status: 'INACTIVE' as const },
];

function setup(platformPermissions: Array<{ code: string; status: string }> = [{ code: 'platform.admin', status: 'ACTIVE' }]) {
  const admin = AuthService.user('admin', 'admin@example.test', 'secret');
  const events: any[] = [];
  const audit = new AuditService({ create: async ({ data }) => { events.push(data); return data; }, findMany: async () => events });
  const recordAudit = (event: Record<string, unknown>) => audit.append(event as any);
  const companies = new CompaniesService(companyFixtures.map(c => ({ ...c })), [
    { id: 'membership-a', userId: 'admin', companyId: 'company-a', status: 'ACTIVE' },
    { id: 'membership-b', userId: 'admin', companyId: 'company-b', status: 'ACTIVE' },
  ], recordAudit);
  const repository = new InMemoryServiceRepository(serviceFixtures.map(s => ({ ...s })), [], companyFixtures.map(c => ({ ...c })));
  const services = new ServicesService(repository, recordAudit);
  const authorization = new PermissionResolver(() => ({ userId: 'admin', companyId: 'company-a', membership: { status: 'ACTIVE' }, roles: [], platformPermissions }));
  const auth = new AuthService([admin], { jwtSecret: 'test-secret' }, undefined, new InMemorySessionRepository());
  const app = createApplication({ auth, audit, companies, services, authorization, menu: new MenuService([]) });
  return { app, events, repository, services, auth, audit, companies, authorization };
}

async function adminHeaders(app: Application) {
  const login = await app.handle('/v1/auth/login', { method: 'POST', body: { email: 'admin@example.test', password: 'secret' } });
  return { authorization: `Bearer ${(login.body as any).accessToken}` };
}

test('platform admin lists the seeded catalog and creates services with unique, normalized codes', async () => {
  const fixture = setup(); const headers = await adminHeaders(fixture.app);
  const list = await fixture.app.handle('/v1/platform/services', { headers });
  assert.equal(list.status, 200);
  assert.deepEqual((list.body as any[]).map(service => service.code), ['acueducto', 'energia', 'gas']);
  const created = await fixture.app.handle('/v1/platform/services', { method: 'POST', headers, body: { code: 'Telecom', name: 'Telecomunicaciones', description: 'Gestión de telecomunicaciones.' } });
  assert.equal(created.status, 201);
  assert.equal((created.body as any).code, 'telecom');
  assert.equal((created.body as any).status, 'ACTIVE');
  const duplicate = await fixture.app.handle('/v1/platform/services', { method: 'POST', headers, body: { code: 'ACUEDUCTO', name: 'Otro acueducto' } });
  assert.equal(duplicate.status, 409);
  const invalid = await fixture.app.handle('/v1/platform/services', { method: 'POST', headers, body: { code: 'codigo con espacios', name: 'Inválido' } });
  assert.equal(invalid.status, 400);
  const missing = await fixture.app.handle('/v1/platform/services', { method: 'POST', headers, body: { code: 'nuevo' } });
  assert.equal(missing.status, 400);
  assert.equal((await fixture.services.list()).length, 4);
});

test('service catalog and assignment mutations reject non-admin callers with 403 and no mutation', async () => {
  const fixture = setup([]);
  const headers = await adminHeaders(fixture.app);
  assert.equal((await fixture.app.handle('/v1/platform/services', { method: 'POST', headers, body: { code: 'telecom', name: 'Telecom' } })).status, 403);
  assert.equal((await fixture.app.handle('/v1/platform/services/svc-water', { method: 'PATCH', headers, body: { status: 'INACTIVE' } })).status, 403);
  assert.equal((await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'svc-water' } })).status, 403);
  assert.equal((await fixture.services.list()).length, 3);
  assert.equal((await fixture.services.listAssignments()).length, 0);
  assert.ok(fixture.events.some(event => event.resource === 'platform-administration' && event.result === 'DENIED'));
});

test('assignment is fail-closed: active company and active service only, no duplicates', async () => {
  const fixture = setup(); const headers = await adminHeaders(fixture.app);
  const assigned = await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'svc-water' } });
  assert.equal(assigned.status, 201);
  assert.equal((assigned.body as any).serviceName, 'Acueducto');
  assert.equal((assigned.body as any).companyName, 'Empresa A');
  assert.equal((await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'svc-water' } })).status, 409);
  assert.equal((await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'svc-gas' } })).status, 400);
  assert.equal((await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-c', serviceId: 'svc-energy' } })).status, 400);
  assert.equal((await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'missing', serviceId: 'svc-energy' } })).status, 404);
  assert.equal((await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'missing' } })).status, 404);
  const list = await fixture.app.handle('/v1/platform/company-services', { headers });
  assert.equal(list.status, 200);
  assert.deepEqual((list.body as any[]).map(item => [item.serviceName, item.companyName, item.status]), [['Acueducto', 'Empresa A', 'ACTIVE']]);
});

test('deactivating a service keeps its assignments, blocks new ones, and hides it from enabled services', async () => {
  const fixture = setup(); const headers = await adminHeaders(fixture.app);
  await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'svc-water' } });
  const deactivated = await fixture.app.handle('/v1/platform/services/svc-water', { method: 'PATCH', headers, body: { status: 'INACTIVE' } });
  assert.equal(deactivated.status, 200);
  assert.equal((await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-b', serviceId: 'svc-water' } })).status, 400);
  assert.equal((await fixture.services.listAssignments()).length, 1);
  assert.deepEqual(await fixture.services.listEnabled('company-a'), []);
  await fixture.app.handle('/v1/platform/services/svc-water', { method: 'PATCH', headers, body: { status: 'ACTIVE' } });
  assert.deepEqual(await fixture.services.listEnabled('company-a'), [{ code: 'acueducto', name: 'Acueducto' }]);
});

test('assignment deactivation hides the service and reassignment reactivates the same record', async () => {
  const fixture = setup(); const headers = await adminHeaders(fixture.app);
  const assigned = await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'svc-energy' } });
  const assignmentId = (assigned.body as any).id as string;
  const deactivated = await fixture.app.handle(`/v1/platform/company-services/${assignmentId}`, { method: 'PATCH', headers, body: { status: 'INACTIVE' } });
  assert.equal(deactivated.status, 200);
  assert.deepEqual(await fixture.services.listEnabled('company-a'), []);
  assert.equal((await fixture.app.handle(`/v1/platform/company-services/${assignmentId}`, { method: 'PATCH', headers, body: { status: 'INACTIVE' } })).status, 200);
  const reassigned = await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'svc-energy' } });
  assert.equal(reassigned.status, 201);
  assert.equal((reassigned.body as any).id, assignmentId);
  assert.equal((reassigned.body as any).status, 'ACTIVE');
  assert.equal((await fixture.services.listAssignments()).length, 1);
  assert.equal((await fixture.app.handle('/v1/platform/company-services/missing', { method: 'PATCH', headers, body: { status: 'INACTIVE' } })).status, 404);
});

test('authorization context surfaces only the enabled services of the active company', async () => {
  const fixture = setup(); const headers = await adminHeaders(fixture.app);
  await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'svc-energy' } });
  await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'svc-water' } });
  const contextA = await fixture.app.handle('/v1/me/authorization-context', { headers: { ...headers, 'X-Company-Id': 'company-a' } });
  assert.equal(contextA.status, 200);
  assert.deepEqual((contextA.body as any).services, [{ code: 'acueducto', name: 'Acueducto' }, { code: 'energia', name: 'Energía' }]);
  const contextB = await fixture.app.handle('/v1/me/authorization-context', { headers: { ...headers, 'X-Company-Id': 'company-b' } });
  assert.equal(contextB.status, 200);
  assert.deepEqual((contextB.body as any).services, []);
});

test('every service mutation writes audit evidence with actor, company, action, result and before/after', async () => {
  const fixture = setup(); const headers = await adminHeaders(fixture.app);
  await fixture.app.handle('/v1/platform/services', { method: 'POST', headers, body: { code: 'telecom', name: 'Telecomunicaciones' } });
  await fixture.app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'svc-water' } });
  await fixture.app.handle('/v1/platform/services/svc-water', { method: 'PATCH', headers, body: { status: 'INACTIVE' } });
  const creation = fixture.events.find(event => event.resource === 'service' && event.action === 'create');
  assert.equal(creation.userId, 'admin');
  assert.equal(creation.result, 'SUCCESS');
  assert.deepEqual(creation.detail.after, { code: 'telecom', name: 'Telecomunicaciones', status: 'ACTIVE' });
  const assignment = fixture.events.find(event => event.resource === 'company-service' && event.action === 'assign');
  assert.equal(assignment.userId, 'admin');
  assert.equal(assignment.companyId, 'company-a');
  assert.deepEqual(assignment.detail.after, { status: 'ACTIVE' });
  const lifecycle = fixture.events.find(event => event.resource === 'service' && event.action === 'update');
  assert.equal(lifecycle.userId, 'admin');
  assert.deepEqual(lifecycle.detail, { before: { status: 'ACTIVE' }, after: { status: 'INACTIVE' } });
});

test('records are scoped by service and disabled services are rejected fail-closed', async () => {
  const fixture = setup(); const headers = await adminHeaders(fixture.app);
  const repository = new InMemoryOperationalDemoRepository([
    { id: 'record-water', companyId: 'company-a', label: 'Lectura de agua', serviceCode: 'acueducto', status: 'ACTIVE' },
    { id: 'record-energy', companyId: 'company-a', label: 'Lectura de energía', serviceCode: 'energia', status: 'ACTIVE' },
  ]);
  const authorization = new PermissionResolver(() => ({ userId: 'admin', companyId: 'company-a', membership: { status: 'ACTIVE' }, roles: [{ companyId: 'company-a', status: 'ACTIVE', permissions: [{ code: 'operational-demo.read' }] }], platformPermissions: [{ code: 'platform.admin', status: 'ACTIVE' }] }));
  const app = createApplication({ auth: fixture.auth, audit: fixture.audit, companies: fixture.companies, services: fixture.services, authorization, menu: new MenuService([]), operationalDemo: new OperationalDemoService(repository) });
  await app.handle('/v1/platform/company-services', { method: 'POST', headers, body: { companyId: 'company-a', serviceId: 'svc-water' } });
  const water = await app.handle('/v1/companies/company-a/operational-demo-records', { headers: { ...headers, 'X-Company-Id': 'company-a', 'X-Service-Code': 'acueducto' } });
  assert.equal(water.status, 200);
  assert.deepEqual((water.body as any[]).map(record => record.label), ['Lectura de agua']);
  const gas = await app.handle('/v1/companies/company-a/operational-demo-records', { headers: { ...headers, 'X-Company-Id': 'company-a', 'X-Service-Code': 'gas' } });
  assert.equal(gas.status, 403);
  const cross = await app.handle('/v1/companies/company-a/operational-demo-records/record-energy', { headers: { ...headers, 'X-Company-Id': 'company-a', 'X-Service-Code': 'acueducto' } });
  assert.equal(cross.status, 404);
});
