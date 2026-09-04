import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
    import { COMPANY_SCOPED } from './http';
import type { HttpHandler, HttpRequest, HttpResponse } from './http';

type Client = Pick<HttpClient, 'request'>;
export class HttpClientTransport implements HttpHandler {
  private readonly client: Client;
  constructor(client: Client) { this.client = client; }
  async handle<T>(req: HttpRequest<T>): Promise<HttpResponse<T>> {
    const companyId = req.context?.get(COMPANY_SCOPED) ? globalThis.sessionStorage?.getItem('sic_company_id') : null;
    const headers = companyId ? { ...req.headers, 'X-Company-Id': companyId } : req.headers;
    const result = this.client.request<T>(req.method, req.url, { body: req.body, headers, observe: 'response', withCredentials: true });
    const response = typeof (result as any)?.then === 'function' ? await result : await firstValueFrom(result as any);
    const typed = response as { status: number; body: T | null };
    return { status: typed.status, body: typed.body ?? undefined };
  }
}
