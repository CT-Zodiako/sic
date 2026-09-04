import type { CompanyContextStore } from './company-context.store';
import type { AuthStore } from '../../core/auth.store';
export type GuardResult = true | string;
export const authGuard = (auth: AuthStore, attemptedUrl = '/') => auth.authenticated ? true : `/login?returnUrl=${encodeURIComponent(attemptedUrl)}`;
export const companyContextGuard = (context: CompanyContextStore) => context.hasReadyContext ? true : context.state === 'no-company' ? '/no-company' : '/select-company';
export type PermissionRouteData = { anyOf?: string[]; allOf?: string[] };
export const permissionGuard = (context: CompanyContextStore, data: PermissionRouteData) => {
  if (data.anyOf?.length && !data.anyOf.some(p => context.can(p))) return '/access-denied';
  if (data.allOf?.length && !data.allOf.every(p => context.can(p))) return '/access-denied';
  return true;
};
