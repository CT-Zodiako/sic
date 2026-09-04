export type TenantDelegate = {
  findMany?(args: { where: Record<string, unknown> }): Promise<unknown[]>;
  findUnique?(args: { where: Record<string, unknown> }): Promise<unknown | null>;
  create?(args: { data: Record<string, unknown> }): Promise<unknown>;
  update?(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<unknown>;
};

/** Adapter for tenant models: companyId is mandatory at the API boundary and injected into every query. */
export class TenantRepository {
  private readonly delegate: TenantDelegate;
  constructor(delegate: TenantDelegate) { this.delegate = delegate; }
  private scope(companyId: unknown) { if (typeof companyId !== 'string' || !companyId.trim()) throw new Error('COMPANY_SCOPE_REQUIRED'); return companyId.trim(); }
  private where(companyId: string, where: Record<string, unknown> = {}) { if (where.companyId !== undefined && (typeof where.companyId !== 'string' || where.companyId.trim() !== companyId)) throw new Error('COMPANY_SCOPE_MISMATCH'); return { ...where, companyId }; }
  findMany(companyId: string, where: Record<string, unknown> = {}) { const fn = this.delegate.findMany; if (!fn) throw new Error('REPOSITORY_OPERATION_UNAVAILABLE'); return fn({ where: this.where(this.scope(companyId), where) }); }
  findUnique(companyId: string, where: Record<string, unknown>) { const fn = this.delegate.findUnique; if (!fn) throw new Error('REPOSITORY_OPERATION_UNAVAILABLE'); return fn({ where: this.where(this.scope(companyId), where) }); }
  create(companyId: string, data: Record<string, unknown>) { const fn = this.delegate.create; if (!fn) throw new Error('REPOSITORY_OPERATION_UNAVAILABLE'); return fn({ data: this.where(this.scope(companyId), data) }); }
  update(companyId: string, where: Record<string, unknown>, data: Record<string, unknown>) { const fn = this.delegate.update; if (!fn) throw new Error('REPOSITORY_OPERATION_UNAVAILABLE'); return fn({ where: this.where(this.scope(companyId), where), data: this.where(this.scope(companyId), data) }); }
}

export const TenantRepositoryAdapter = TenantRepository;
