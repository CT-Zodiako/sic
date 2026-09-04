import assert from 'node:assert/strict';
import test from 'node:test';
import { validateEnvironment, ConfigurationError } from './config.ts';
import { problem } from './errors.ts';
import { redact } from './redaction.ts';
import { requestId } from './request.ts';
import { whitelist } from './validation.ts';

test('configuration fails without required values and does not expose values', () => {
  assert.throws(() => validateEnvironment({ DATABASE_URL: ' ' }, ['DATABASE_URL', 'JWT_SECRET']), (error) => error instanceof ConfigurationError && error.message.includes('JWT_SECRET'));
});
test('request IDs accept safe correlation values and replace malformed values', () => {
  assert.equal(requestId('req-123'), 'req-123');
  assert.notEqual(requestId('bad value'), 'bad value');
});
test('whitelist rejects mass assignment and redacts secrets recursively', () => {
  assert.throws(() => whitelist({ name: 'x', passwordHash: 'oops' }, ['name']));
  assert.deepEqual(redact({ token: 'abc', nested: { password: 'pw', ok: true } }), { token: '[REDACTED]', nested: { password: '[REDACTED]', ok: true } });
});
test('problem body is RFC 9457-shaped and correlated', () => {
  assert.deepEqual(problem(403, 'PERMISSION_DENIED', 'Not allowed.', 'req-1'), { type: 'https://httpstatuses.com/403', title: 'Forbidden', status: 403, code: 'PERMISSION_DENIED', detail: 'Not allowed.', requestId: 'req-1' });
});
