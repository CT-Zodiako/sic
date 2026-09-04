import assert from 'node:assert/strict';
import test from 'node:test';
import { TenantRepository } from '../src/tenancy/repository.ts';
import { AuthService } from '../src/auth/auth.service.ts';
import { InMemorySessionRepository } from '../src/auth/session.service.ts';
import { createApplication } from '../src/app.ts';
import { CompaniesService } from '../src/companies/companies.service.ts';
import { MenuService } from '../src/menu/menu.service.ts';
import { PermissionResolver, type AuthorizationState } from '../src/authorization/resolver.ts';

test('tenant repository always injects companyId and rejects unscoped operations', async () => {
  const calls: any[] = [];
  const repository = new TenantRepository({ findMany: async (args: any) => { calls.push(args); return []; } });
  await repository.findMany(' company-a ', { status: 'ACTIVE', companyId: ' company-a ' });
  assert.deepEqual(calls[0].where, { status: 'ACTIVE', companyId: 'company-a' });
  assert.throws(() => (repository as any).findMany(), /COMPANY_SCOPE_REQUIRED/);
});

test('tenant context route distinguishes unauthenticated and malformed context', async () => {
  const auth = new AuthService([AuthService.user('u1', 'a@example.test', 'secret')], { jwtSecret: 'test-secret' }, undefined, new InMemorySessionRepository());
  const app = createApplication({ auth });
  const anonymous = await app.handle('/v1/tenant/context');
  assert.equal(anonymous.status, 401);
  const login = await app.handle('/v1/auth/login', { method: 'POST', body: { email: 'a@example.test', password: 'secret' } });
  const token = (login.body as { accessToken: string }).accessToken;
  const missing = await app.handle('/v1/tenant/context', { headers: { authorization: `Bearer ${token}` } });
  assert.equal(missing.status, 400);
  const mismatch = await app.handle('/v1/tenant/context', { headers: { authorization: `Bearer ${token}`, 'X-Company-Id': 'company-a' }, body: { companyId: 'company-b' } });
  assert.equal(mismatch.status, 400);
});

test('authorization context exposes every active role permission, not only menu permissions', async () => {
  const user = AuthService.user('u1', 'all-grants@example.test', 'secret');
  const companies = new CompaniesService([{ id: 'company-a', name: 'Company A' }], [{ id: 'membership-a', userId: 'u1', companyId: 'company-a' }]);
  const authorization = new PermissionResolver(async () => ({ userId: 'u1', companyId: 'company-a', membership: { status: 'ACTIVE' }, roles: [{ companyId: 'company-a', status: 'ACTIVE', permissions: [{ code: 'operational-demo.read' }, { code: 'operational-demo.create' }] }] }));
  const menu = new MenuService([{ id: 'demo', label: 'Demo', route: '/demo', permissions: ['operational-demo.read'] }]);
  const app = createApplication({ auth: new AuthService([user], { jwtSecret: 'test-secret' }, undefined, new InMemorySessionRepository()), companies, authorization, menu });
  const login = await app.handle('/v1/auth/login', { method: 'POST', body: { email: user.email, password: 'secret' } });
  const token = (login.body as { accessToken: string }).accessToken;
  const response = await app.handle('/v1/me/authorization-context', { headers: { authorization: `Bearer ${token}`, 'X-Company-Id': 'company-a' } });
  assert.equal(response.status, 200);
  assert.deepEqual((response.body as any).permissions, ['operational-demo.create', 'operational-demo.read']);
});

test('valid membership with no menu grants returns an empty authorization context', async () => {
  const user = AuthService.user('u1', 'empty-context@example.test', 'secret');
  const companies = new CompaniesService([{ id: 'company-b', name: 'Company B' }], [{ id: 'membership-b', userId: 'u1', companyId: 'company-b' }]);
  const state: AuthorizationState = { userId: 'u1', companyId: 'company-b', membership: { status: 'ACTIVE' }, roles: [] };
  const authorization = new PermissionResolver(async () => state);
  const menu = new MenuService([{ id: 'admin', label: 'Admin', route: '/admin', permissions: ['admin.read'] }]);
  const app = createApplication({ auth: new AuthService([user], { jwtSecret: 'test-secret' }, undefined, new InMemorySessionRepository()), companies, authorization, menu });
  const login = await app.handle('/v1/auth/login', { method: 'POST', body: { email: user.email, password: 'secret' } });
  const token = (login.body as { accessToken: string }).accessToken;
  const response = await app.handle('/v1/me/authorization-context', { headers: { authorization: `Bearer ${token}`, 'X-Company-Id': 'company-b' } });
  assert.equal(response.status, 200);
  assert.deepEqual((response.body as any).permissions, []);
  assert.deepEqual((response.body as any).menu, []);
});

test('application maps unexpected errors to the common internal error problem', async () => {
  const app = createApplication({ users: [AuthService.user('u1', 'a@example.test', 'secret')] });
  const response = await app.handle('/v1/auth/login', { method: 'POST', body: { email: 'a@example.test', password: 'secret' } });
  assert.equal(response.status, 500);
  assert.equal((response.body as { code: string }).code, 'INTERNAL_ERROR');
});
