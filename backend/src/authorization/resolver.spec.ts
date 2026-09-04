import assert from 'node:assert/strict';
import test from 'node:test';
import { PermissionResolver, requirePermission, type AuthorizationState } from './resolver.ts';

test('resolver unions active same-company roles and ignores inactive or expired grants', () => {
  const state: AuthorizationState = { userId: 'u1', companyId: 'a', membership: { status: 'ACTIVE' }, roles: [
    { companyId: 'a', status: 'ACTIVE', permissions: [{ code: 'read', status: 'ACTIVE' }] },
    { companyId: 'a', status: 'ACTIVE', permissions: [{ code: 'write', status: 'ACTIVE', endsAt: new Date(1) }] },
    { companyId: 'a', status: 'INACTIVE', permissions: [{ code: 'delete', status: 'ACTIVE' }] },
    { companyId: 'b', status: 'ACTIVE', permissions: [{ code: 'cross', status: 'ACTIVE' }] },
  ] };
  const resolver = new PermissionResolver(() => state);
  assert.equal(resolver.can('u1', 'a', 'read'), true);
  assert.equal(resolver.can('u1', 'a', 'write', 'ANY', { now: new Date(2) }), false);
  assert.equal(resolver.can('u1', 'a', 'cross'), false);
});

test('resolver honors explicit Date now at grant boundaries', () => {
  const resolver = new PermissionResolver(() => ({ userId: 'u', companyId: 'a', membership: { status: 'ACTIVE', startsAt: new Date(10), endsAt: new Date(20) }, roles: [{ companyId: 'a', status: 'ACTIVE', permissions: [{ code: 'read', status: 'ACTIVE', startsAt: new Date(10), endsAt: new Date(20) }] }] }));
  assert.equal(resolver.can('u', 'a', 'read', 'ANY', { now: new Date(9) }), false);
  assert.equal(resolver.can('u', 'a', 'read', 'ANY', { now: new Date(10) }), true);
  assert.equal(resolver.can('u', 'a', 'read', 'ANY', { now: new Date(20) }), false);
});

test('platform permission can be checked without a tenant membership', async () => {
  const resolver = new PermissionResolver({
    load: async () => undefined,
    platform: async () => [{ code: 'platform.admin', status: 'ACTIVE' }],
  });
  assert.equal(await resolver.canPlatformAsync('u1', 'platform.admin'), true);
  assert.equal(await resolver.canPlatformAsync('u1', 'other.permission'), false);
});

test('requirePermission accepts thenables', async () => {
  const thenable = { then: (resolve: (value: boolean) => void) => resolve(true) };
  await requirePermission(thenable);
});

test('inactive membership and role-name-only claims are denied, including after revocation', () => {
  let active = true;
  const resolver = new PermissionResolver(() => ({ userId: 'u', companyId: 'a', membership: { status: active ? 'ACTIVE' : 'INACTIVE' }, roles: [{ companyId: 'a', status: 'ACTIVE', permissions: [{ code: 'read', status: 'ACTIVE' }] }], }));
  assert.equal(resolver.can('u', 'a', 'read'), true);
  active = false;
  assert.equal(resolver.can('u', 'a', 'read'), false);
  assert.equal(resolver.can('u', 'a', 'administrator'), false);
});

test('ANY and ALL policies require explicit platform override opt-in', () => {
  const resolver = new PermissionResolver(() => ({ userId: 'u', companyId: 'a', membership: { status: 'ACTIVE' }, roles: [], platformPermissions: [{ code: 'platform.admin', status: 'ACTIVE' }] }));
  assert.equal(resolver.can('u', 'a', ['one', 'platform.admin'], 'ANY'), false);
  assert.equal(resolver.can('u', 'a', ['one', 'platform.admin'], 'ANY', { allowPlatform: true }), true);
  assert.equal(resolver.can('u', 'a', ['one', 'platform.admin'], 'ALL'), false);
  assert.equal(resolver.can('u', 'a', 'platform.admin'), false);
  assert.equal(resolver.can('u', 'a', 'platform.admin', 'ANY', { allowPlatform: true }), true);
});
