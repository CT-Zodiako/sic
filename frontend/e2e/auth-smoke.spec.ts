import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthStore } from '../src/app/core/auth.store.ts';
import { AuthInterceptor, ResponseInterceptor, composeInterceptors } from '../src/app/core/interceptors.ts';
import { request, type HttpHandler } from '../src/app/core/http.ts';

const unauthorized = () => Object.assign(new Error('unauthorized'), { status: 401 });

/** Lightweight browser-session harness: it exercises the same interceptor chain as the SPA. */
class BrowserAuthHarness {
  readonly store = new AuthStore();
  readonly routes: string[][] = [];
  private readonly handler: HttpHandler;

  constructor(terminal: HttpHandler, refresh: () => Promise<string>) {
    const response = new ResponseInterceptor(this.store, refresh, { navigate: path => this.routes.push(path) });
    this.handler = composeInterceptors([new AuthInterceptor(this.store), response], terminal);
  }

  request() { return this.handler.handle(request('GET', '/v1/protected')); }
}

test('browser smoke: concurrent 401 responses use one serialized refresh and retry', async () => {
  const harness = new BrowserAuthHarness({
    handle: async req => {
      if (req.headers.Authorization === 'Bearer old') throw unauthorized();
      return { status: 200, body: req.headers.Authorization };
    },
  }, async () => {
    await new Promise(resolve => setTimeout(resolve, 1));
    harness.store.setAccessToken('new');
    return 'new';
  });
  harness.store.setSession('old');

  const results = await Promise.all([harness.request(), harness.request()]);

  assert.deepEqual(results.map(result => result.body), ['Bearer new', 'Bearer new']);
  assert.equal(harness.store.accessToken, 'new');
  assert.deepEqual(harness.routes, []);
});

test('browser smoke: refresh failure logs out and returns to login', async () => {
  const harness = new BrowserAuthHarness({ handle: async () => { throw unauthorized(); } }, async () => {
    throw unauthorized();
  });
  harness.store.setSession('expired');

  await assert.rejects(harness.request());

  assert.equal(harness.store.authenticated, false);
  assert.deepEqual(harness.routes, [['/login']]);
});
