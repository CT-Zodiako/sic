import assert from 'node:assert/strict';
import test from 'node:test';
import { AuthStore } from './auth.store.ts';
import { COMPANY_SCOPED, HttpContext, request, type HttpHandler } from './http.ts';
import { AuthInterceptor, CompanyHeaderInterceptor, ResponseInterceptor } from './interceptors.ts';
import { authGuard } from './routes.ts';

const error = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status });
const ok = (request: any) => Promise.resolve({ status: 200, body: request });

test('AuthStore transitions and never persists access tokens', () => {
  const store = new AuthStore(); const states: string[] = [];
  store.subscribe((snapshot) => states.push(snapshot.state));
  store.setSession('access-token', { id: 'u1', email: 'u@example.test', name: 'User' });
  assert.equal(store.authenticated, true); assert.equal(store.accessToken, 'access-token');
  assert.equal(Object.keys(store).some((key) => /storage|local/i.test(key)), false);
  store.logout(); assert.equal(store.state.state, 'anonymous'); assert.deepEqual(states, ['authenticated', 'anonymous']);
});

test('auth interceptor attaches bearer and company marker excludes auth and platform headers', async () => {
  const store = new AuthStore(); store.setSession('token'); const auth = new AuthInterceptor(store);
  const seen: any[] = []; const next: HttpHandler = { handle: (req) => { seen.push(req); return ok(req); } };
  await auth.intercept(request('GET', '/v1/me/companies'), next);
  assert.equal(seen[0].headers.Authorization, 'Bearer token');
  const company = new CompanyHeaderInterceptor(() => 'company-a');
  await company.intercept(request('POST', '/v1/auth/login', new HttpContext().set(COMPANY_SCOPED, true)), next);
  await company.intercept(request('GET', '/v1/platform/users', new HttpContext().set(COMPANY_SCOPED, true)), next);
  await company.intercept(request('GET', '/v1/tenant/context', new HttpContext().set(COMPANY_SCOPED, true)), next);
  assert.equal(seen[1].headers['X-Company-Id'], undefined); assert.equal(seen[2].headers['X-Company-Id'], undefined); assert.equal(seen[3].headers['X-Company-Id'], 'company-a');
});

test('concurrent 401s share one refresh and retry with the new token', async () => {
  const store = new AuthStore(); store.setSession('old'); let refreshes = 0; let calls = 0;
  const terminal: HttpHandler = { handle: async (req) => { calls++; if (calls <= 2) throw error(401); return { status: 200, body: req.headers.Authorization }; } };
  const interceptor = new ResponseInterceptor(store, async () => { refreshes++; await new Promise((resolve) => setTimeout(resolve, 1)); store.setAccessToken('new'); return 'new'; }, { navigate: () => undefined });
  const results = await Promise.all([interceptor.intercept(request('GET', '/v1/protected'), terminal), interceptor.intercept(request('GET', '/v1/protected'), terminal)]);
  assert.equal(refreshes, 1); assert.deepEqual(results.map((result) => result.body), ['Bearer new', 'Bearer new']);
});

test('refresh failure logs out and routes safely; anonymous navigation redirects to login', async () => {
  const store = new AuthStore(); store.setSession('expired'); const routes: string[][] = [];
  const interceptor = new ResponseInterceptor(store, async () => { throw error(401); }, { navigate: (path) => routes.push(path) });
  await assert.rejects(interceptor.intercept(request('GET', '/v1/protected'), { handle: async () => { throw error(401); } }));
  assert.equal(store.authenticated, false); assert.deepEqual(routes, [['/login']]); assert.equal(authGuard(false, '/admin'), '/login?returnUrl=%2Fadmin');
});

test('403 and 404 use safe routes without exposing response details', async () => {
  const routes: string[][] = []; const interceptor = new ResponseInterceptor(new AuthStore(), async () => 'x', { navigate: (path) => routes.push(path) });
  for (const status of [403, 404]) await assert.rejects(interceptor.intercept(request('GET', '/v1/resource'), { handle: async () => { throw error(status); } }));
  assert.deepEqual(routes, [['/access-denied'], ['/not-found']]);
});
