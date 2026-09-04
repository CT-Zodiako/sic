import assert from 'node:assert/strict';
import test from 'node:test';
import { Injector, runInInjectionContext } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '../auth.store';
import { CompanyContextStore } from '../../features/company-context/company-context.store';
import { authGuard, companyContextGuard, permissionGuard } from './index.ts';

test('guards fail closed with safe redirects', () => {
  assert.equal(authGuard({ authenticated: false } as any, {} as any), '/login');
  assert.equal(companyContextGuard({ hasReadyContext: false, state: 'no-company' } as any, {} as any), '/no-company');
  assert.equal(permissionGuard({ can: () => false } as any, { anyOf: ['admin'] }, {} as any), '/access-denied');
});

test('Angular guard branches return UrlTrees for denied navigation', () => {
  const loginTree = { kind: 'login' };
  const deniedTree = { kind: 'denied' };
  const injector = Injector.create({ providers: [
    { provide: AuthStore, useValue: { authenticated: false } },
    { provide: CompanyContextStore, useValue: { hasReadyContext: false, state: 'no-company', can: () => false } },
    { provide: Router, useValue: { createUrlTree: (commands: unknown[]) => commands[0] === '/login' ? loginTree : deniedTree } },
  ] });
  assert.equal(runInInjectionContext(injector, () => authGuard({} as any, { url: '/private' } as any)), loginTree);
  assert.equal(runInInjectionContext(injector, () => companyContextGuard({} as any, {} as any)), deniedTree);
  assert.equal(runInInjectionContext(injector, () => permissionGuard({ data: { anyOf: ['admin'] } } as any, {} as any)), deniedTree);
});
