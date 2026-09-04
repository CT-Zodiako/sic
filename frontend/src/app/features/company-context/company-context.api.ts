import { COMPANY_SCOPED, HttpContext, request, type HttpHandler, type HttpResponse } from '../../core/http';

export type Company = { id: string; name: string; membershipId?: string };
export type MenuNode = { id: string; label: string; icon?: string; route?: string; navigable: boolean; children: MenuNode[] };
export type EnabledService = { code: string; name: string };
export type AuthorizationContext = { company: Company | null; permissions: string[]; menu: MenuNode[]; services?: EnabledService[] };
export type ContextTransport = Pick<HttpHandler, 'handle'>;
const scoped = () => new HttpContext().set(COMPANY_SCOPED, true);
const body = async <T>(response: HttpResponse<T>) => { if (!response.body) throw new Error('Empty API response.'); return response.body; };

export class CompanyContextApiClient {
  private readonly transport: ContextTransport;
  constructor(transport: ContextTransport) { this.transport = transport; }
  async listCompanies() { const value = await body<Company[] | { companies: Company[] }>(await this.transport.handle(request('GET', '/v1/me/companies'))); return Array.isArray(value) ? value : value.companies; }
  async selectCompany(companyId: string) { return body<{ companyId: string }>(await this.transport.handle(request('PUT', '/v1/me/active-company', new HttpContext(), {}, { companyId }) as any) as HttpResponse<{ companyId: string }>); }
  async authorizationContext() { return body<AuthorizationContext>(await this.transport.handle(request('GET', '/v1/me/authorization-context', scoped()))); }
  async platformContext() { return body<AuthorizationContext>(await this.transport.handle(request('GET', '/v1/me/authorization-context'))); }
}
export { COMPANY_SCOPED };
