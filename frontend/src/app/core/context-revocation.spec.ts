import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthStore } from './auth.store.ts';
import { ResponseInterceptor } from './interceptors.ts';
import { request } from './http.ts';

test('403 invalidates the current authorization context before safe routing', async () => {
  const calls: string[] = []; const interceptor = new ResponseInterceptor(new AuthStore(), async () => 'token', { navigate: p => calls.push(p.join('/')) }, () => calls.push('invalidated'));
  await assert.rejects(interceptor.intercept(request('GET', '/v1/protected'), { handle: async () => { throw Object.assign(new Error('forbidden'), { status: 403 }); } }));
  assert.deepEqual(calls, ['invalidated', '/access-denied']);
});
