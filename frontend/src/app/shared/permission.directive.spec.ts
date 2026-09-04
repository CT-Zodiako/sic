import assert from 'node:assert/strict';
import test from 'node:test';
import { PermissionActionDirective, can } from './permission.directive.ts';

test('permission controls are presentation only and evaluate any/all semantics', () => {
  const permissions = new Set(['invoice.read']); const shown: boolean[] = [];
  const directive = new PermissionActionDirective({ show: () => shown.push(true), hide: () => shown.push(false) }, () => permissions);
  assert.equal(directive.update('invoice.read'), true); assert.equal(directive.update('invoice.delete'), false);
  assert.equal(can(permissions, ['invoice.read', 'invoice.delete'], 'all'), false); assert.deepEqual(shown, [true, false]);
});
