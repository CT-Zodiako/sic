import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from '../src/app.ts';

test('GET /v1/health returns the API smoke response', async () => {
  assert.deepEqual(await createApplication().get('/v1/health'), {
    status: 200,
    body: { status: 'ok' },
  });
});

test('unknown API routes return a stable not-found response', async () => {
  assert.deepEqual(await createApplication().get('/v1/missing'), {
    status: 404,
    body: { status: 'not_found' },
  });
});
