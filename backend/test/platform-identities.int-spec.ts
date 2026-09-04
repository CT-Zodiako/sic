import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from '../src/auth/auth.service.ts';
import { InMemorySessionRepository } from '../src/auth/session.service.ts';
import { CompaniesService, PrismaCompanyRepository } from '../src/companies/companies.service.ts';
import { PermissionResolver } from '../src/authorization/resolver.ts';
import { createApplication } from '../src/app.ts';

function setup(platform = true) {
  const user = AuthService.user('admin', 'admin@example.test', 'secret');
  const companies = new CompaniesService([{ id: 'company-a', name: 'A' }], [{ id: 'membership-a', userId: 'admin', companyId: 'company-a', status: 'ACTIVE' }]);
  const auth = new AuthService([user], { jwtSecret: 'test-secret' }, undefined, new InMemorySessionRepository());
  const authorization = new PermissionResolver(() => ({ userId: 'admin', companyId: 'company-a', membership: { status: 'ACTIVE' }, roles: [], platformPermissions: platform ? [{ code: 'platform.admin', status: 'ACTIVE' }] : [] }));
  return { app: createApplication({ auth, companies, authorization }) };
}
async function token(app: ReturnType<typeof setup>['app']) { const response = await app.handle('/v1/auth/login', { method: 'POST', body: { email: 'admin@example.test', password: 'secret' } }); return (response.body as any).accessToken; }

test('platform administration requires explicit platform.admin', async () => {
  const { app } = setup(false); const accessToken = await token(app);
  const response = await app.handle('/v1/platform/companies', { method: 'POST', headers: { authorization: `Bearer ${accessToken}`, 'X-Company-Id': 'company-a' }, body: { name: 'B' } });
  assert.equal(response.status, 403); assert.equal((response.body as any).code, 'PERMISSION_DENIED');
});

test('platform DTOs reject mass assignment and duplicate resources', async () => {
  const { app } = setup(); const accessToken = await token(app); const headers = { authorization: `Bearer ${accessToken}`, 'X-Company-Id': 'company-a' };
  assert.equal((await app.handle('/v1/platform/companies', { method: 'POST', headers, body: { name: 'B', isAdmin: true } })).status, 400);
  assert.equal((await app.handle('/v1/platform/companies', { method: 'POST', headers, body: { name: 'B' } })).status, 201);
  assert.equal((await app.handle('/v1/platform/companies', { method: 'POST', headers, body: { name: 'B' } })).status, 409);
});

test('membership deactivation removes the company on the next request', async () => {
  const { app } = setup(); const accessToken = await token(app); const headers = { authorization: `Bearer ${accessToken}`, 'X-Company-Id': 'company-a' };
  assert.equal((await app.handle('/v1/me/companies', { headers })).status, 200);
  await app.handle('/v1/platform/memberships/membership-a', { method: 'DELETE', headers });
  assert.deepEqual((await app.handle('/v1/me/companies', { headers })).body, { companies: [] });
});

test('missing membership deactivation does not write a success audit', async () => {
  const calls: string[] = [];
  const membership = { findUnique: async () => undefined, update: async () => { throw new Error('update should not be called'); } };
  const auditEvent = { create: async ({ data }: any) => { calls.push(`audit:${data.action}`); return data; } };
  const client = { company: {}, membership, auditEvent, async $transaction(fn: (tx: any) => Promise<unknown>) { calls.push('transaction.begin'); const result = await fn({ membership, auditEvent }); calls.push('transaction.commit'); return result; } };
  const service = new CompaniesService([], [], undefined, new PrismaCompanyRepository(client as any));
  await assert.rejects(() => service.deactivateMembership('missing-membership', 'admin'));
  assert.deepEqual(calls, ['transaction.begin', 'transaction.commit']);
    });

    test('Prisma company mutations use one transaction for mutation and audit', async () => {
  const calls: string[] = [];
  const auditPayloads: any[] = [];
  const company = { findMany: async () => [{ id: 'company-a', name: 'A', status: 'ACTIVE' }], count: async () => 1, create: async ({ data }: any) => { calls.push(`company.create:${data.name}`); return { ...data }; } };
  const membership = { findMany: async () => [], count: async () => 0, create: async ({ data }: any) => { calls.push(`membership.create:${data.userId}`); return data; }, findUnique: async () => ({ id: 'membership-a', userId: 'u', companyId: 'company-a', status: 'ACTIVE' }), update: async ({ data }: any) => { calls.push(`membership.update:${data.status}`); return { id: 'membership-a', userId: 'u', companyId: 'company-a', ...data }; } };
  const auditEvent = { create: async ({ data }: any) => { calls.push(`audit:${data.action}`); auditPayloads.push(data); return data; } };
  const client = { company, membership, auditEvent, async $transaction(fn: (tx: any) => Promise<unknown>) { calls.push('transaction.begin'); const result = await fn({ company, membership, auditEvent }); calls.push('transaction.commit'); return result; } };
  const service = new CompaniesService([], [], undefined, new PrismaCompanyRepository(client as any));
  await service.create({ name: 'B' }, 'admin');
  await service.establishMembership({ userId: 'u', companyId: 'company-a' }, 'admin');
  await service.deactivateMembership('membership-a', 'admin');
  assert.deepEqual(calls, ['transaction.begin', 'company.create:B', 'audit:create', 'transaction.commit', 'transaction.begin', 'membership.create:u', 'audit:establish', 'transaction.commit', 'transaction.begin', 'membership.update:INACTIVE', 'audit:deactivate', 'transaction.commit']);
      assert.equal(auditPayloads[2].companyId, 'company-a');
});
