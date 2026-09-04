import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from '../src/auth/auth.service.ts';
import { InMemorySessionRepository } from '../src/auth/session.service.ts';
import { PermissionResolver, type AuthorizationState } from '../src/authorization/resolver.ts';
import { CompaniesService, PrismaCompanyRepository } from '../src/companies/companies.service.ts';
import { MenuService, PrismaMenuRepository } from '../src/menu/menu.service.ts';
import { PrismaAuthorizationRepository } from '../src/authorization/resolver.ts';
import { createApplication } from '../src/app.ts';

test('me context lists active companies and recursively filters a three-level menu', async () => {
  const user = AuthService.user('u1', 'context@example.test', 'secret');
  const companies = new CompaniesService(
    [{ id: 'a', name: 'Alpha' }, { id: 'b', name: 'Beta' }],
    [{ id: 'm1', userId: 'u1', companyId: 'a' }, { id: 'm2', userId: 'u1', companyId: 'b', status: 'INACTIVE' }],
  );
  const state: AuthorizationState = { userId: 'u1', companyId: 'a', membership: { status: 'ACTIVE' }, roles: [{ companyId: 'a', permissions: [{ code: 'read.leaf' }] }] };
  const resolver = new PermissionResolver(async (userId, companyId) => userId === 'u1' && companyId === 'a' ? state : undefined);
  const menu = new MenuService([
    { id: 'root', label: 'Root', sortOrder: 1 },
    { id: 'parent', label: 'Parent', parentId: 'root', route: '/parent', permissions: ['parent.read'] },
    { id: 'leaf', label: 'Leaf', parentId: 'parent', route: '/leaf', permissions: ['read.leaf'] },
    { id: 'hidden', label: 'Hidden', parentId: 'root', permissions: ['nope'] },
  ]);
  const app = createApplication({ auth: new AuthService([user], { jwtSecret: 'test-secret' }, undefined, new InMemorySessionRepository()), companies, authorization: resolver, menu });
  const login = await app.handle('/v1/auth/login', { method: 'POST', body: { email: user.email, password: 'secret' } });
  const token = (login.body as { accessToken: string }).accessToken;
  const list = await app.handle('/v1/me/companies', { headers: { authorization: `Bearer ${token}` } });
  assert.deepEqual((list.body as any).companies.map((c: any) => c.id), ['a']);
  const missing = await app.handle('/v1/me/authorization-context', { headers: { authorization: `Bearer ${token}` } });
  assert.equal(missing.status, 400);
  const context = await app.handle('/v1/me/authorization-context', { headers: { authorization: `Bearer ${token}`, 'X-Company-Id': 'a' } });
  assert.equal(context.status, 200);
  const root = (context.body as any).menu[0];
  assert.equal(root.children[0].navigable, false);
  assert.equal(root.children[0].children[0].route, '/leaf');
});

test('Prisma context adapters map delegates without weakening tenant scope', async () => {
  const companyRepository = new PrismaCompanyRepository({ findMany: async args => {
    assert.deepEqual(args.where, { userId: 'u', status: 'ACTIVE', startsAt: { lte: new Date(0) }, OR: [{ endsAt: null }, { endsAt: { gt: new Date(0) } }], company: { status: 'ACTIVE' } });
    return [{ id: 'm', userId: 'u', companyId: 'a', status: 'ACTIVE', startsAt: new Date(0), company: { id: 'a', name: 'Alpha', status: 'ACTIVE' } }];
  } });
  const companies = new CompaniesService([], [], undefined, companyRepository);
  assert.deepEqual(await companies.listActive('u', new Date(0)), [{ id: 'a', name: 'Alpha', membershipId: 'm' }]);

  const menu = new MenuService([], new PrismaMenuRepository({ findMany: async () => [{ id: 'item', name: 'Item', module: { status: 'ACTIVE' }, permissions: [{ permission: { code: 'read', status: 'ACTIVE' } }] }] }));
  assert.deepEqual((await menu.list())[0]?.permissions, ['read']);

  const authorization = new PrismaAuthorizationRepository(
    { findUnique: async () => ({ status: 'ACTIVE', startsAt: new Date(0), roles: [{ role: { status: 'ACTIVE', permissions: [{ permission: { code: 'read', status: 'ACTIVE' } }] } }] }) },
    { findMany: async () => [] },
  );
  assert.equal(await new PermissionResolver(authorization).canAsync('u', 'a', 'read'), true);
});

test('company selection is auditable and invalid selection fails closed', async () => {
  const events: unknown[] = [];
  const service = new CompaniesService([{ id: 'a', name: 'Alpha' }], [{ id: 'm', userId: 'u', companyId: 'a' }], event => { events.push(event); });
  await service.select('u', 'a');
  await assert.rejects(() => service.select('u', 'b'), (error: any) => error.code === 'COMPANY_CONTEXT_INVALID');
  assert.equal(events.length, 1);
});
