import { AUTH_REQUEST, REFRESH_REQUEST, HttpContext, type HttpHandler, type HttpResponse, request } from './http';
import type { AuthStore, AuthUser } from './auth.store';

export type LoginResponse = { accessToken: string; user: AuthUser };
export type RefreshResponse = { accessToken: string };
export type AuthTransport = Pick<HttpHandler, 'handle'>;

export class AuthApiClient {
  private readonly transport: AuthTransport;
  constructor(transport: AuthTransport) { this.transport = transport; }
  login(email: string, password: string): Promise<HttpResponse<LoginResponse>> {
    return this.transport.handle<LoginResponse>(request('POST', '/v1/auth/login', new HttpContext().set(AUTH_REQUEST, true), {}, { email, password } as unknown as LoginResponse));
  }
  refresh(): Promise<HttpResponse<RefreshResponse>> {
    return this.transport.handle(request('POST', '/v1/auth/refresh', new HttpContext().set(AUTH_REQUEST, true).set(REFRESH_REQUEST, true)));
  }
}

export const authenticate = async (api: AuthApiClient, store: AuthStore, email: string, password: string) => {
  const response = await api.login(email, password);
  if (response.body) store.setSession(response.body.accessToken, response.body.user);
  return response;
};

export { AUTH_REQUEST, REFRESH_REQUEST };
