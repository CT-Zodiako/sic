import assert from 'node:assert/strict';
import test from 'node:test';
import { APP_ROUTES } from './routes.ts';
import { AuthenticatedShellComponent } from '../shared/authenticated-shell.component';

test('runtime routes provide login and authenticated shell', () => {
  assert.ok(APP_ROUTES.some(route => route.path === 'login'));
  const shell = APP_ROUTES.find(route => route.path === '');
  assert.equal(shell?.canActivate?.length, 1);
  assert.equal(shell?.component, AuthenticatedShellComponent);
  assert.ok(APP_ROUTES.some(route => route.path === 'access-denied'));
});
