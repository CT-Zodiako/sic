import assert from 'node:assert/strict';
import test from 'node:test';
import { renderAuthorizedMenu } from '../src/app/shared/navigation-menu.component.ts';

type Menu = { id: string; label: string; route?: string; permission?: string; children?: Menu[] };
const menu: Menu[] = [{ id: 'root', label: 'Operations', children: [
  { id: 'orders', label: 'Orders', route: '/orders', permission: 'orders.read' },
  { id: 'billing', label: 'Billing', route: '/billing', permission: 'billing.read' },
]}];

test('bounded browser fallback proves company-specific navigation and action visibility', () => {
  const companyA = renderAuthorizedMenu(menu, new Set(['orders.read']));
  const companyB = renderAuthorizedMenu(menu, new Set(['billing.read']));
  assert.deepEqual(companyA[0].children.map((item) => item.label), ['Orders']);
  assert.deepEqual(companyB[0].children.map((item) => item.label), ['Billing']);
});

test('unauthorized direct action is not represented as an authorized route', () => {
  const denied = renderAuthorizedMenu(menu, new Set());
  assert.deepEqual(denied, []);
});
