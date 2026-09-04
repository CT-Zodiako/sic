import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from '../../src/app.ts';
import { AuditService } from '../../src/audit/audit.service.ts';
import { AuthService } from '../../src/auth/auth.service.ts';
import { InMemorySessionRepository } from '../../src/auth/session.service.ts';
import { PermissionResolver, type AuthorizationState } from '../../src/authorization/resolver.ts';
import { InMemoryOperationalDemoRepository, OperationalDemoService } from '../../src/operational-demo/operational-demo.service.ts';
import { TenantContext } from '../../src/tenancy/context.ts';

const state: AuthorizationState = {
  userId: 'demo-user',
  companyId: 'company-a',
  membership: { status: 'ACTIVE' },
  roles: [
    { companyId: 'company-a', status: 'ACTIVE', permissions: [{ code: 'orders.read' }] },
    { companyId: 'company-a', status: 'ACTIVE', permissions: [{ code: 'orders.update' }] },
  ],
  platformPermissions: [],
};

function resolverFor(current: AuthorizationState = state) {
  return new PermissionResolver(() => current);
}

test('two companies expose different permissions and same-company roles are unioned', async () => {
  const current = { ...state };
  const resolver = resolverFor(current);
  assert.equal(await resolver.canAsync('demo-user', 'company-a', ['orders.read', 'orders.update'], 'ALL'), true);
  current.companyId = 'company-b';
  current.roles = [{ companyId: 'company-b', status: 'ACTIVE', permissions: [{ code: 'invoices.read' }] }];
  assert.equal(await resolver.canAsync('demo-user', 'company-b', 'orders.read'), false);
  assert.equal(await resolver.canAsync('demo-user', 'company-b', 'invoices.read'), true);
});

test('missing or mismatched context fails closed and direct HTTP cannot bypass UI permissions', async () => {
  const auth = new AuthService([AuthService.user('demo-user', 'demo@example.test', 'secret')], { jwtSecret: 'e2e-secret' }, undefined, new InMemorySessionRepository());
  const app = createApplication({ auth, authorization: resolverFor(), operationalDemo: new OperationalDemoService(new InMemoryOperationalDemoRepository()) });
  const login = await app.handle('/v1/auth/login', { method: 'POST', body: { email: 'demo@example.test', password: 'secret' } });
  const token = (login.body as { accessToken: string }).accessToken;
  assert.equal((await app.handle('/v1/tenant/context', { headers: { authorization: `Bearer ${token}` } })).status, 400);
  assert.equal((await app.handle('/v1/tenant/context', { headers: { authorization: `Bearer ${token}`, 'X-Company-Id': 'company-a' }, body: { companyId: 'company-b' } })).status, 400);
  assert.equal((await app.handle('/v1/companies/company-a/operational-demo-records', { headers: { authorization: `Bearer ${token}`, 'X-Company-Id': 'company-a' } })).status, 403);
});

test('platform administrator can configure without a company context', async () => {
  const current: AuthorizationState = { userId: 'admin', companyId: '', membership: { status: 'ACTIVE' }, roles: [], platformPermissions: [{ code: 'platform.admin' }] };
  const auth = new AuthService([AuthService.user('admin', 'platform@example.test', 'secret')], { jwtSecret: 'e2e-secret' }, undefined, new InMemorySessionRepository());
  const app = createApplication({ auth, authorization: new PermissionResolver(() => current), operationalDemo: new OperationalDemoService(new InMemoryOperationalDemoRepository()) });
  const login = await app.handle('/v1/auth/login', { method: 'POST', body: { email: 'platform@example.test', password: 'secret' } });
  const token = (login.body as { accessToken: string }).accessToken;
  assert.equal((await app.handle('/v1/platform/users', { headers: { authorization: `Bearer ${token}` } })).status, 200);
});

test('operational complete route requires action permission and changes record status', async () => {
  const current: AuthorizationState = { userId: 'demo-user', companyId: 'company-a', membership: { status: 'ACTIVE' }, roles: [{ companyId: 'company-a', status: 'ACTIVE', permissions: [{ code: 'operational-demo.action' }] }], platformPermissions: [] };
  const repository = new InMemoryOperationalDemoRepository([{ id: 'record-a', companyId: 'company-a', label: 'A', status: 'ACTIVE' }]);
  const auth = new AuthService([AuthService.user('demo-user', 'action@example.test', 'secret')], { jwtSecret: 'e2e-secret' }, undefined, new InMemorySessionRepository());
  const app = createApplication({ auth, authorization: new PermissionResolver(() => current), operationalDemo: new OperationalDemoService(repository) });
  const login = await app.handle('/v1/auth/login', { method: 'POST', body: { email: 'action@example.test', password: 'secret' } });
  const token = (login.body as { accessToken: string }).accessToken;
  const response = await app.handle('/v1/companies/company-a/operational-demo-records/record-a/actions/complete', { method: 'POST', headers: { authorization: `Bearer ${token}`, 'X-Company-Id': 'company-a' }, body: { action: 'complete' } });
  assert.equal(response.status, 200);
  assert.equal(repository.records[0].status, 'INACTIVE');
});

test('cross-company IDOR is a non-disclosing 404 for detail and mutation', async () => {
  const repository = new InMemoryOperationalDemoRepository([{ id: 'record-b', companyId: 'company-b', label: 'B', status: 'ACTIVE' }]);
  const service = new OperationalDemoService(repository);
  const context = new TenantContext({ userId: 'demo-user', companyId: 'company-a' });
  await assert.rejects(() => service.detail(context, 'record-b'), (error: any) => error.status === 404 && error.code === 'RESOURCE_NOT_FOUND');
  await assert.rejects(() => service.update(context, 'record-b', { label: 'stolen' }), (error: any) => error.status === 404);
  assert.equal(repository.records[0].label, 'B');
});

test('authorized direct HTTP cross-company lookup remains a non-disclosing 404', async () => {
  const current: AuthorizationState = {
    userId: 'demo-user', companyId: 'company-a', membership: { status: 'ACTIVE' },
    roles: [{ companyId: 'company-a', status: 'ACTIVE', permissions: [{ code: 'operational-demo.read' }] }], platformPermissions: [],
  };
  const repository = new InMemoryOperationalDemoRepository([{ id: 'record-b-http', companyId: 'company-b', label: 'B', status: 'ACTIVE' }]);
  const auth = new AuthService([AuthService.user('demo-user', 'idor@example.test', 'secret')], { jwtSecret: 'e2e-secret' }, undefined, new InMemorySessionRepository());
  const app = createApplication({ auth, authorization: new PermissionResolver(() => current), operationalDemo: new OperationalDemoService(repository) });
  const login = await app.handle('/v1/auth/login', { method: 'POST', body: { email: 'idor@example.test', password: 'secret' } });
  const token = (login.body as { accessToken: string }).accessToken;
  const response = await app.handle('/v1/companies/company-a/operational-demo-records/record-b-http', { headers: { authorization: `Bearer ${token}`, 'X-Company-Id': 'company-a' } });
  assert.equal(response.status, 404);
  assert.equal(repository.records[0].label, 'B');
});

test('role, permission, membership, and platform revocation apply on the next request', async () => {
  const current = resolverFor();
  assert.equal(await current.canAsync('demo-user', 'company-a', 'orders.read'), true);
  state.roles[0].status = 'INACTIVE';
  assert.equal(await current.canAsync('demo-user', 'company-a', 'orders.read'), false);
  state.membership.status = 'INACTIVE';
  assert.equal(await current.canAsync('demo-user', 'company-a', 'orders.update'), false);
  state.membership.status = 'ACTIVE';
  state.roles[1].permissions[0].status = 'INACTIVE';
  assert.equal(await current.canAsync('demo-user', 'company-a', 'orders.update'), false);
  state.platformPermissions = [{ code: 'platform.admin' }];
  assert.equal(await current.canAsync('demo-user', 'company-a', 'platform.admin', 'ANY', { allowPlatform: true }), true);
  state.platformPermissions[0].status = 'INACTIVE';
  assert.equal(await current.canAsync('demo-user', 'company-a', 'platform.admin', 'ANY', { allowPlatform: true }), false);
  state.roles = [{ companyId: 'company-a', status: 'ACTIVE', permissions: [{ code: 'orders.read' }] }];
  state.membership.status = 'ACTIVE';
});

test('refresh rotation rejects reuse and audit reads are append-only, redacted, and bounded', async () => {
  const events: Record<string, unknown>[] = [];
  const audit = new AuditService({
    create: async ({ data }) => { events.push(data); return data; },
    findMany: async () => events,
  });
  const auth = new AuthService([AuthService.user('demo-user', 'refresh@example.test', 'secret')], { jwtSecret: 'e2e-secret' }, undefined, new InMemorySessionRepository());
  const login = await auth.login('refresh@example.test', 'secret');
  const rotated = await auth.refresh(login.token);
  await assert.rejects(() => auth.refresh(login.token), (error: any) => error.code === 'SESSION_REVOKED');
  assert.notEqual(rotated.token, login.token);
  await audit.append({ userId: 'demo-user', resource: 'session', action: 'login', result: 'SUCCESS', detail: { password: 'secret', token: login.token, requestId: 'request-1' } });
  const read = await audit.read({ take: 1 });
  assert.equal((read[0] as any).detail.password, undefined);
  assert.equal((read[0] as any).detail.token, undefined);
  assert.equal(typeof audit.append, 'function');
  assert.equal((audit as any).update, undefined);
  assert.equal((audit as any).delete, undefined);
});

test('authorization context remains within the normal latency target', async () => {
  const started = performance.now();
  const resolver = resolverFor();
  await Promise.all(Array.from({ length: 20 }, () => resolver.canAsync('demo-user', 'company-a', 'orders.read')));
  assert.ok(performance.now() - started < 2000);
});
