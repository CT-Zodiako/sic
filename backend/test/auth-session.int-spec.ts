import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from '../src/app.ts';
import { AuditService } from '../src/audit/audit.service.ts';
import { AuthService } from '../src/auth/auth.service.ts';
import { InMemorySessionRepository, PrismaSessionRepository } from '../src/auth/session.service.ts';

test('default application auth composition fails closed without a session repository', () => {
  assert.throws(() => createApplication().auth, /SESSION_REPOSITORY_REQUIRED/);
});

test('production composition selects the injected Prisma session repository', async () => {
  const delegate = {
    create: async ({ data }: { data: Record<string, unknown> }) => data,
    findUnique: async () => null,
    update: async ({ data }: { data: Record<string, unknown> }) => data,
  };
  const repository = new PrismaSessionRepository(delegate);
  const app = createApplication({
    users: [AuthService.user('u1', 'a@example.test', 'secret')],
    authConfig: { jwtSecret: 'test-secret' },
    sessionRepository: repository,
  });
  assert.equal(app.auth.sessions.repository, repository);
});

test('application-provided audit service receives auth session events', async () => {
  const events: Record<string, unknown>[] = [];
  const audit = { create: async ({ data }: { data: Record<string, unknown> }) => { events.push(data); return data; }, findMany: async () => [] };
  const app = createApplication({
    users: [AuthService.user('u1', 'a@example.test', 'secret')],
    authConfig: { jwtSecret: 'test-secret' },
    sessionRepository: new InMemorySessionRepository(),
    audit: new AuditService(audit),
  });
  await app.auth.login('a@example.test', 'secret', 100);
  assert.equal(events.some((event) => event.resource === 'session' && event.action === 'login'), true);
});

test('auth routes issue secure cookie and enforce revoked session on next request', async () => {
  const auth = new AuthService([AuthService.user('u1', 'a@example.test', 'secret')], { jwtSecret: 'test-secret' }, undefined, new InMemorySessionRepository());
  const app = createApplication({ auth });
  const login = await app.handle('/v1/auth/login', { method: 'POST', body: { email: 'a@example.test', password: 'secret' } });
  assert.equal(login.status, 200);
  assert.match(login.headers?.['set-cookie'] ?? '', /HttpOnly/);
      assert.equal((login.headers?.['set-cookie'] ?? '').includes('Secure'), process.env.NODE_ENV === 'production', 'Secure flag applies only in production');
  const accessToken = (login.body as { accessToken: string }).accessToken;
  const me = await app.handle('/v1/auth/me', { headers: { authorization: `Bearer ${accessToken}` } });
  assert.equal(me.status, 200);
  const logout = await app.handle('/v1/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${accessToken}` } });
  assert.equal(logout.status, 200);
  const denied = await app.handle('/v1/auth/me', { headers: { authorization: `Bearer ${accessToken}` } });
  assert.equal(denied.status, 401);
  assert.equal((denied.body as { code: string }).code, 'SESSION_REVOKED');
});
