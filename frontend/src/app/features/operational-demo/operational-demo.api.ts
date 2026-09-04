import { COMPANY_SCOPED, HttpContext, request, type HttpHandler, type HttpResponse } from '../../core/http';

export type DemoRecord = { id: string; companyId: string; label: string; status: 'ACTIVE' | 'INACTIVE' };
export type DemoTransport = Pick<HttpHandler, 'handle'>;
const scoped = () => new HttpContext().set(COMPANY_SCOPED, true);
const result = async <T>(response: HttpResponse<T>) => { if (response.body === undefined) throw new Error('Empty API response.'); return response.body; };
const segment = (value: string) => encodeURIComponent(value);

export class OperationalDemoApiClient {
  private readonly transport: DemoTransport;
  constructor(transport: DemoTransport) { this.transport = transport; }
  private async send<T>(url: string, body?: unknown, method?: string, serviceCode?: string) { const verb = method ?? (body === undefined ? 'GET' : 'POST'); const headers: Record<string, string> = serviceCode ? { 'X-Service-Code': serviceCode } : {}; return result<T>(await this.transport.handle(request(verb, url, scoped(), headers, body) as any) as HttpResponse<T>); }
  list(companyId: string, serviceCode?: string) { return this.send<DemoRecord[]>(`/v1/companies/${segment(companyId)}/operational-demo-records`, undefined, undefined, serviceCode); }
  detail(companyId: string, id: string, serviceCode?: string) { return this.send<DemoRecord>(`/v1/companies/${segment(companyId)}/operational-demo-records/${segment(id)}`, undefined, undefined, serviceCode); }
  create(companyId: string, label: string, serviceCode?: string) { return this.send<DemoRecord>(`/v1/companies/${segment(companyId)}/operational-demo-records`, { label }, undefined, serviceCode); }
  update(companyId: string, id: string, label: string, serviceCode?: string) { return this.send<DemoRecord>(`/v1/companies/${segment(companyId)}/operational-demo-records/${segment(id)}`, { label }, 'PATCH', serviceCode); }
  remove(companyId: string, id: string, serviceCode?: string) { return this.send<{ deleted: boolean }>(`/v1/companies/${segment(companyId)}/operational-demo-records/${segment(id)}`, undefined, 'DELETE', serviceCode); }
  complete(companyId: string, id: string, serviceCode?: string) { return this.send<DemoRecord>(`/v1/companies/${segment(companyId)}/operational-demo-records/${segment(id)}/actions/complete`, {}, undefined, serviceCode); }
}
