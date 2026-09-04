import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthService } from './auth.service.ts';
import { verifyAccessToken } from './jwt.ts';
import { InMemorySessionRepository, PrismaSessionRepository } from './session.service.ts';

test('access tokens contain only identity and time claims and validate issuer/audience', async () => {
  const auth = new AuthService([AuthService.user('u1', 'a@example.test', 'secret')], { jwtSecret: 'test-secret' }, undefined, new InMemorySessionRepository());
  const login = await auth.login('a@example.test', 'secret', 100);
  const claims = verifyAccessToken(login.accessToken, { secret: 'test-secret', issuer: 'sic-api', audience: 'sic-web', now: 101 });
  assert.deepEqual(Object.keys(claims).sort(), ['exp', 'iat', 'sid', 'sub']);
  assert.throws(() => verifyAccessToken(login.accessToken, { secret: 'test-secret', issuer: 'other', audience: 'sic-web', now: 101 }));
});

test('refresh rotation is one-time and logout denies the next request', async () => {
  const auth = new AuthService([AuthService.user('u1', 'a@example.test', 'secret')], { jwtSecret: 'test-secret' }, undefined, new InMemorySessionRepository());
  const login = await auth.login('a@example.test', 'secret', 100);
  const rotated = await auth.refresh(login.token, 101);
  await assert.rejects(() => auth.refresh(login.token, 102), (error: unknown) => (error as { code?: string }).code === 'SESSION_REVOKED');
  assert.deepEqual(await auth.me(rotated.accessToken, 102), { id: 'u1', email: 'a@example.test', name: 'a@example.test' });
  await auth.logout(rotated.accessToken, 103);
  await assert.rejects(() => auth.me(rotated.accessToken, 104), (error: unknown) => (error as { code?: string }).code === 'SESSION_REVOKED');
});

test('invalid credentials and expired access tokens are denied', async () => {
  const auth = new AuthService([AuthService.user('u1', 'a@example.test', 'secret')], { jwtSecret: 'test-secret', accessTtlSeconds: 2 }, undefined, new InMemorySessionRepository());
  await assert.rejects(() => auth.login('a@example.test', 'wrong'), /Invalid credentials/);
  const login = await auth.login('a@example.test', 'secret', 100);
  await assert.rejects(() => auth.me(login.accessToken, 103), (error: unknown) => (error as { code?: string }).code === 'TOKEN_EXPIRED');
});

test('Prisma session persistence is used through AuthService operations', async () => {
  const records = new Map<string, any>();
  const delegate = {
    async create({ data }: any) { records.set(data.id, { ...data }); return records.get(data.id); },
    async findUnique({ where }: any) { return [...records.values()].find((record) => Object.entries(where).every(([key, value]) => record[key] === value)) ?? null; },
    async update({ where, data }: any) { const record = records.get(where.id); Object.assign(record, data); return record; },
  };
  const repository = new PrismaSessionRepository(delegate);
  const auth = new AuthService([AuthService.user('u1', 'a@example.test', 'secret')], { jwtSecret: 'test-secret' }, undefined, repository);
  const login = await auth.login('a@example.test', 'secret', 100);
  const rotated = await auth.refresh(login.token, 101);
  assert.equal(await auth.me(rotated.accessToken, 102).then((user) => user.id), 'u1');
  await auth.logout(rotated.accessToken, 103);
  await assert.rejects(() => auth.me(rotated.accessToken, 104));
});
