export type HttpHeaders = Record<string, string>;

export type HttpRequest<T = unknown> = {
  method: string;
  url: string;
  headers: HttpHeaders;
  body?: T;
  context?: HttpContext;
  clone(changes: Partial<HttpRequest<T>> & { setHeaders?: HttpHeaders }): HttpRequest<T>;
};

export type HttpResponse<T = unknown> = { status: number; body?: T };
export type HttpErrorResponse = Error & { status: number; error?: unknown };
export type HttpHandler = { handle<T>(request: HttpRequest<T>): Promise<HttpResponse<T>> };

export class HttpContextToken<T> {
  readonly defaultValue: () => T;
  constructor(defaultValue: () => T) { this.defaultValue = defaultValue; }
}

export class HttpContext {
  private readonly values = new Map<HttpContextToken<unknown>, unknown>();
  set<T>(token: HttpContextToken<T>, value: T): HttpContext { this.values.set(token as HttpContextToken<unknown>, value); return this; }
  get<T>(token: HttpContextToken<T>): T { return (this.values.has(token as HttpContextToken<unknown>) ? this.values.get(token as HttpContextToken<unknown>) : token.defaultValue()) as T; }
}

export const request = <T>(method: string, url: string, context = new HttpContext(), headers: HttpHeaders = {}, body?: T): HttpRequest<T> => ({
  method, url, headers, context, body,
  clone(changes) { return request(changes.method ?? method, changes.url ?? url, changes.context ?? context, { ...headers, ...changes.setHeaders }, changes.body === undefined ? body : changes.body); },
});

export const COMPANY_SCOPED = new HttpContextToken<boolean>(() => false);
export const AUTH_REQUEST = new HttpContextToken<boolean>(() => false);
export const REFRESH_REQUEST = new HttpContextToken<boolean>(() => false);
export const NO_RETRY = new HttpContextToken<boolean>(() => false);
