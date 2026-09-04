import type { AuthStore } from '../../core/auth.store';
import type { CompanyContextApiClient, Company, AuthorizationContext, MenuNode, EnabledService } from './company-context.api';

export type ContextState = 'idle' | 'loading-companies' | 'selecting' | 'loading-context' | 'ready' | 'no-company' | 'invalidated';
export type ContextSnapshot = { state: ContextState; companies: Company[]; selectedCompanyId: string | null; permissions: ReadonlySet<string>; menu: MenuNode[]; services: EnabledService[] };

const empty = (state: ContextState = 'idle'): ContextSnapshot => ({ state, companies: [], selectedCompanyId: null, permissions: new Set(), menu: [], services: [] });

export class CompanyContextStore {
  private snapshot: ContextSnapshot = empty();
  private readonly listeners = new Set<(snapshot: ContextSnapshot) => void>();
  private requestSerial = 0;
  private readonly api: CompanyContextApiClient;
  private readonly auth?: AuthStore;
  constructor(api: CompanyContextApiClient, auth?: AuthStore) { this.api = api; this.auth = auth; }
  get state() { return this.snapshot; }
  get selectedCompanyId() { return this.snapshot.selectedCompanyId; }
  get permissions() { return this.snapshot.permissions; }
  get menu() { return this.snapshot.menu; }
  get hasReadyContext() { return this.snapshot.state === 'ready'; }
  subscribe(listener: (snapshot: ContextSnapshot) => void) { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  async loadCompanies(): Promise<Company[]> {
    if (this.auth && !this.auth.authenticated) { this.clear('idle'); return []; }
    this.publish({ ...empty('loading-companies') });
    try {
      const companies = await this.api.listCompanies();
      this.publish({ ...empty(companies.length ? 'idle' : 'no-company'), companies });
      const remembered = globalThis.sessionStorage?.getItem('sic_company_id');
      if (remembered && companies.some(company => company.id === remembered)) { void this.selectCompany(remembered); return companies; }
      // Platform admins get their menu without choosing a company (fire-and-forget).
      void (async () => {
        try {
          const platform = await this.api.platformContext?.();
          if (platform && Array.isArray(platform.permissions) && !this.snapshot.selectedCompanyId) this.applyContext(platform);
        } catch { /* not a platform admin: company selection required */ }
      })();
      return companies;
    } catch {
      this.publish({ ...empty('invalidated') });
      return [];
    }
  }
  async selectCompany(companyId: string): Promise<AuthorizationContext> {
    const serial = ++this.requestSerial;
    const companies = this.snapshot.companies;
    // Clear before awaiting either API call: old permissions must never render for the new company.
    globalThis.sessionStorage?.removeItem('sic_permissions'); this.publish({ ...empty('selecting'), companies, selectedCompanyId: null });
    try { globalThis.sessionStorage?.setItem('sic_company_id', companyId); await this.api.selectCompany(companyId); } catch (error) { if (serial === this.requestSerial) this.invalidate(); throw error; }
    if (serial !== this.requestSerial) throw new Error('Company selection superseded.');
    this.publish({ ...empty('loading-context'), companies, selectedCompanyId: companyId });
    let context: AuthorizationContext;
    try { context = await this.api.authorizationContext(); } catch (error) { if (serial === this.requestSerial) this.invalidate(); throw error; }
    if (serial !== this.requestSerial) throw new Error('Company selection superseded.');
    this.applyContext(context);
    return context;
  }
  applyContext(context: AuthorizationContext) { globalThis.sessionStorage?.setItem('sic_permissions', JSON.stringify(context.permissions)); this.publish({ state: 'ready', companies: this.snapshot.companies, selectedCompanyId: context.company?.id ?? null, permissions: new Set(context.permissions), menu: context.menu, services: context.services ?? [] }); }
  invalidate() { this.requestSerial++; globalThis.sessionStorage?.removeItem('sic_permissions'); this.publish({ ...empty('invalidated'), companies: this.snapshot.companies }); }
  clear(state: ContextState = 'idle') { this.requestSerial++; globalThis.sessionStorage?.removeItem('sic_company_id'); globalThis.sessionStorage?.removeItem('sic_permissions'); this.publish({ ...empty(state) }); }
  can(code: string) { if (this.snapshot.permissions.has(code)) return true; try { return (JSON.parse(globalThis.sessionStorage?.getItem('sic_permissions') ?? '[]') as string[]).includes(code); } catch { return false; } }
  private publish(snapshot: ContextSnapshot) { this.snapshot = Object.freeze(snapshot); for (const listener of this.listeners) listener(this.snapshot); }
}
