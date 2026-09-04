import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthStore } from '../auth.store';
import { CompanyContextStore } from '../../features/company-context/company-context.store';

/**
 * The object-shaped branches retain the small, framework-free helpers used by
 * the legacy unit tests. Router calls use UrlTrees, which Angular can consume
 * as a redirect result rather than a truthy allow value.
 */
type LegacyGuard = (...args: any[]) => boolean | string;

export const authGuard = ((routeOrAuth: any, stateOrUrl: any = '/') => {
  if ('authenticated' in routeOrAuth) return routeOrAuth.authenticated ? true : '/login';
  const auth = inject(AuthStore);
  return auth.authenticated ? true : inject(Router).createUrlTree(['/login'], { queryParams: { returnUrl: stateOrUrl.url } });
}) as CanActivateFn & LegacyGuard;

export const companyContextGuard = ((contextOrRoute: any) => {
  const legacy = 'hasReadyContext' in contextOrRoute;
  const context = legacy ? contextOrRoute : inject(CompanyContextStore);
  if (context.hasReadyContext) return true;
  const target = context.state === 'no-company' ? '/no-company' : '/select-company';
  return legacy ? target : inject(Router).createUrlTree([target]);
}) as CanActivateFn & LegacyGuard;

/**
 * Platform administration needs real backend-derived permissions. When the
 * company context is not ready yet, it loads first; a single-company user is
 * auto-selected, otherwise the shell home asks for a selection. Non-admins
 * always land on access-denied.
 */
export const platformAdminGuard = (async () => {
  const context = inject(CompanyContextStore);
  const router = inject(Router);
  if (!context.hasReadyContext) {
    try {
      const companies = context.state.companies.length ? context.state.companies : await context.loadCompanies();
      if (!context.hasReadyContext) {
        const remembered = globalThis.sessionStorage?.getItem('sic_company_id');
        const target = remembered && companies.some(c => c.id === remembered) ? remembered : companies[0]?.id;
        if (target) await context.selectCompany(target);
        else return router.createUrlTree(['/']);
      }
    } catch { return router.createUrlTree(['/']); }
  }
  return context.can('platform.admin') ? true : router.createUrlTree(['/access-denied']);
}) as CanActivateFn;

export const permissionGuard = ((contextOrRoute: any, data?: any) => {
  const legacy = 'can' in contextOrRoute;
  const context = legacy ? contextOrRoute : inject(CompanyContextStore);
  const rules = legacy ? data : contextOrRoute.data;
  const denied = (rules.anyOf?.length && !rules.anyOf.some((p: string) => context.can(p))) ||
    (rules.allOf?.length && !rules.allOf.every((p: string) => context.can(p)));
  if (!denied) return true;
  return legacy ? '/access-denied' : inject(Router).createUrlTree(['/access-denied']);
}) as CanActivateFn & LegacyGuard;
