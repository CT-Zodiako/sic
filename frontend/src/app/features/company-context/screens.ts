import type { Company } from './company-context.api';
export class CompanySelectorScreen {
  readonly companies: Company[];
  constructor(companies: Company[]) { this.companies = companies; }
  render() { return this.companies.map(c => `<button data-company-id="${c.id}">${c.name}</button>`).join(''); }
}
export class NoCompanyScreen { render() { return '<main data-screen="no-company">No hay empresas activas disponibles.</main>'; } }
export class AccessDeniedScreen { render() { return '<main data-screen="access-denied">Acceso denegado.</main>'; } }
