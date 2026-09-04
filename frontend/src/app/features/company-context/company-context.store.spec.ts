import assert from 'node:assert/strict';
import test from 'node:test';
import { CompanyContextStore } from './company-context.store.ts';

test('select clears stale permissions synchronously and ignores superseded responses', async () => {
  let resolve!: (value: any) => void;
  const api: any = { selectCompany: async (id: string) => ({ id, name: id }), authorizationContext: () => new Promise(r => { resolve = r; }), listCompanies: async () => [] };
  const store = new CompanyContextStore(api);
  store.applyContext({ company: { id: 'a', name: 'A' }, permissions: ['old'], menu: [] });
  const pending = store.selectCompany('b');
  assert.deepEqual([...store.permissions], []);
  await new Promise(r => setTimeout(r, 0));
  resolve({ company: { id: 'b', name: 'B' }, permissions: ['new'], menu: [] });
  await pending;
  assert.deepEqual([...store.permissions], ['new']);
});
