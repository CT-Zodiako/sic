import { ApplicationConfig, inject } from '@angular/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { APP_ROUTES } from './routes';
import { AuthStore } from './auth.store';
import { authHttpInterceptor, companyHttpInterceptor } from './runtime.interceptors';
import { HttpClientTransport } from './http-client.transport';
import { CompanyContextApiClient } from '../features/company-context/company-context.api';
import { CompanyContextStore } from '../features/company-context/company-context.store';

export const appConfig: ApplicationConfig = {
  providers: [
    AuthStore,
    { provide: CompanyContextApiClient, useFactory: () => new CompanyContextApiClient(new HttpClientTransport(inject(HttpClient))) },
    { provide: CompanyContextStore, useFactory: () => new CompanyContextStore(inject(CompanyContextApiClient), inject(AuthStore)) },
    provideRouter(APP_ROUTES),
    provideHttpClient(withInterceptors([authHttpInterceptor, companyHttpInterceptor])),
  ],
};
