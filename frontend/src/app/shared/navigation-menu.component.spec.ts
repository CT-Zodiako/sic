import assert from 'node:assert/strict';
import test from 'node:test';
import { NavigationMenuComponent, renderAuthorizedMenu } from './navigation-menu.component.ts';

test('authenticated company menu keeps configuration and operational links', () => {
  const menu = renderAuthorizedMenu([
    { id: 'operational', label: 'Operaciones', route: '/operational-demo', permission: 'operational-demo.read', children: [] },
    { id: 'admin', label: 'Administración de la plataforma', route: '/platform-admin', permission: 'platform.admin', children: [] },
  ] as any, new Set(['operational-demo.read', 'platform.admin']));
  assert.deepEqual(menu.map(item => [item.label, item.route]), [
    ['Operaciones', '/operational-demo'],
    ['Administración de la plataforma', '/platform-admin'],
  ]);
});

test('recursive menu keeps authorized three-level ancestors and supports keyboard focus', () => {
  const nodes: any[] = [{ id: 'root', label: 'Root', children: [{ id: 'section', label: 'Section', children: [{ id: 'leaf', label: 'Leaf', route: '/leaf', permission: 'read', children: [] }]}]}];
  assert.equal(renderAuthorizedMenu(nodes, new Set(['read']))[0].children[0].children[0].route, '/leaf');
  const menu = new NavigationMenuComponent([]); assert.equal(menu.onKey('ArrowDown', 0, 2), 1);
});
