import assert from 'node:assert/strict';
import test from 'node:test';
import { CompanyContextApiClient } from './company-context.api.ts';
import { CompanyContextStore } from './company-context.store.ts';
import { renderMenu } from './menu.component.ts';
import { companyContextGuard, permissionGuard } from './guards.ts';
import { request, type HttpHandler } from '../../core/http.ts';

test('switch clears stale permissions before Company B context arrives', async () => {
  let resolveContext!: (value: any) => void;
  const transport: HttpHandler = { handle: async (req) => {
    if (req.url.endsWith('/authorization-context')) return { status: 200, body: await new Promise(resolve => { resolveContext = resolve; }) };
    if (req.url.endsWith('/active-company')) return { status: 200, body: { id: 'b', name: 'B' } };
    return { status: 200, body: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] };
  } };
  const store = new CompanyContextStore(new CompanyContextApiClient(transport));
  await store.loadCompanies(); store.applyContext({ company: { id: 'a', name: 'A' }, permissions: ['read'], menu: [] });
  const pending = store.selectCompany('b'); assert.deepEqual([...store.permissions], []); assert.equal(store.hasReadyContext, false);
  await new Promise(resolve => setTimeout(resolve, 0));
  resolveContext({ company: { id: 'b', name: 'B' }, permissions: ['write'], menu: [] }); await pending;
  assert.deepEqual([...store.permissions], ['write']);
});

test('guards deny manually entered routes and menu keeps non-navigable ancestors', () => {
  const context = { hasReadyContext: true, state: 'ready', can: (p: string) => p === 'child.read' } as any;
  assert.equal(permissionGuard(context, { anyOf: ['admin.write'] }), '/access-denied');
  assert.equal(companyContextGuard(context), true);
  const menu = renderMenu([{ id: 'root', label: 'Root', navigable: false, children: [{ id: 'child', label: 'Child', route: '/child', navigable: true, children: [] }] }]);
  assert.deepEqual(menu, [{ id: 'root', label: 'Root', expandable: true, children: [{ id: 'child', label: 'Child', href: '/child', expandable: false, children: [] }] }]);
});
