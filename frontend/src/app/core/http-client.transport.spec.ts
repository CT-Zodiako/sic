import assert from 'node:assert/strict';
import test from 'node:test';
import { HttpClientTransport } from './http-client.transport.ts';

test('maps HTTP client responses to the adapter response shape', async () => {
  const transport = new HttpClientTransport({ request: () => Promise.resolve({ status: 200, body: { ok: true } }) } as never);
  const result = await transport.handle({ method: 'GET', url: '/v1/me', headers: {}, clone: () => { throw new Error('unused'); } });
  assert.deepEqual(result, { status: 200, body: { ok: true } });
});
