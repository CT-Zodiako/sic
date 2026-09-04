import { HttpContextToken, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthStore } from './auth.store';
import { CompanyContextStore } from '../features/company-context/company-context.store';
import { COMPANY_SCOPED, AUTH_REQUEST, REFRESH_REQUEST } from './http';

export const COMPANY_SCOPED_CONTEXT = new HttpContextToken<boolean>(() => false);
export const AUTH_REQUEST_CONTEXT = new HttpContextToken<boolean>(() => false);
export const REFRESH_REQUEST_CONTEXT = new HttpContextToken<boolean>(() => false);

export const authHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const store = inject(AuthStore);
  const auth = req.url.includes('/v1/auth/');
  const token = store.accessToken;
  return next(token && !auth && !req.context.get(REFRESH_REQUEST_CONTEXT) ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req);
};

export const companyHttpInterceptor: HttpInterceptorFn = (req, next) => {
  const id = inject(CompanyContextStore).selectedCompanyId;
  const marked = req.context.get(COMPANY_SCOPED_CONTEXT);
  const excluded = req.url.includes('/v1/auth/') || req.url.includes('/v1/platform');
  return next(id && marked && !excluded ? req.clone({ setHeaders: { 'X-Company-Id': id } }) : req);
};
