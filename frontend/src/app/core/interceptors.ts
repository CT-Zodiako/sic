import { AuthStore } from './auth.store';
import { COMPANY_SCOPED, NO_RETRY, REFRESH_REQUEST, type HttpErrorResponse, type HttpHandler, type HttpRequest, type HttpResponse } from './http';

const isAuthPath = (url: string) => /\/v1\/auth\/(login|refresh|logout|me)(?:[/?]|$)/.test(url);
const isPlatformPath = (url: string) => /\/v1\/platform(?:[/?]|$)/.test(url);

export class AuthInterceptor {
  private readonly store: AuthStore;
  constructor(store: AuthStore) { this.store = store; }
  intercept<T>(req: HttpRequest<T>, next: HttpHandler): Promise<HttpResponse<T>> {
    const token = this.store.accessToken;
    if (!token || req.context?.get(REFRESH_REQUEST) || isAuthPath(req.url)) return next.handle(req);
    return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
  }
}

export class CompanyHeaderInterceptor {
  private readonly companyId: () => string | null;
  constructor(companyId: () => string | null) { this.companyId = companyId; }
  intercept<T>(req: HttpRequest<T>, next: HttpHandler): Promise<HttpResponse<T>> {
    const id = this.companyId();
    const excluded = isAuthPath(req.url) || isPlatformPath(req.url);
    if (!id || excluded || !req.context?.get(COMPANY_SCOPED)) return next.handle(req);
    return next.handle(req.clone({ setHeaders: { 'X-Company-Id': id } }));
  }
}

export type ErrorRouter = { navigate(commands: string[]): void };
export type RefreshAccessToken = () => Promise<string>;
export type ContextInvalidator = () => void;

export class ResponseInterceptor {
  private refreshInFlight: Promise<string> | null = null;
  private readonly store: AuthStore;
  private readonly refresh: RefreshAccessToken;
  private readonly router: ErrorRouter;
  private readonly invalidateContext?: ContextInvalidator;
  constructor(store: AuthStore, refresh: RefreshAccessToken, router: ErrorRouter, invalidateContext?: ContextInvalidator) { this.store = store; this.refresh = refresh; this.router = router; this.invalidateContext = invalidateContext; }

  intercept<T>(req: HttpRequest<T>, next: HttpHandler): Promise<HttpResponse<T>> {
    return next.handle(req).catch((error: HttpErrorResponse) => this.handleError(req, next, error));
  }

  private async handleError<T>(req: HttpRequest<T>, next: HttpHandler, error: HttpErrorResponse): Promise<HttpResponse<T>> {
    if (error.status === 401 && !req.context?.get(NO_RETRY) && !req.context?.get(REFRESH_REQUEST) && !isAuthPath(req.url)) {
      try {
        const token = await this.refreshOnce();
        return next.handle(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
      } catch {
        this.store.logout();
        this.router.navigate(['/login']);
        throw error;
      }
    }
    if (error.status === 403) { this.invalidateContext?.(); this.router.navigate(['/access-denied']); }
    else if (error.status === 404) this.router.navigate(['/not-found']);
    throw error;
  }

  private refreshOnce(): Promise<string> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refresh().finally(() => { this.refreshInFlight = null; });
    }
    return this.refreshInFlight;
  }
}

export const composeInterceptors = (interceptors: Array<{ intercept<T>(request: HttpRequest<T>, next: HttpHandler): Promise<HttpResponse<T>> }>, terminal: HttpHandler): HttpHandler => ({
  handle<T>(req: HttpRequest<T>) {
    const chain = interceptors.reduceRight<HttpHandler>((next, interceptor) => ({ handle: (request) => interceptor.intercept(request, next) }), terminal);
    return chain.handle(req);
  },
});
