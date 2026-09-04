import { randomUUID } from 'node:crypto';
import { ApiError } from '../common/errors.ts';
import { TenantContext } from '../tenancy/context.ts';
import { TenantRepository } from '../tenancy/repository.ts';
import { transactional } from '../database/transactions.ts';

export type OperationalDemoRecord = { id: string; companyId: string; label: string; serviceCode?: string; status: 'ACTIVE' | 'INACTIVE'; createdAt?: Date; updatedAt?: Date };
export type OperationalDemoAudit = Record<string, unknown>;
export type OperationalDemoRepository = {
  list(context: TenantContext): Promise<OperationalDemoRecord[]>;
  findVisibleById(context: TenantContext, id: string): Promise<OperationalDemoRecord | undefined>;
  create(context: TenantContext, record: OperationalDemoRecord, audit?: OperationalDemoAudit): Promise<OperationalDemoRecord>;
  updateVisible(context: TenantContext, id: string, data: Partial<OperationalDemoRecord>, audit?: OperationalDemoAudit): Promise<OperationalDemoRecord | undefined>;
  deleteVisible?(context: TenantContext, id: string, audit?: OperationalDemoAudit): Promise<boolean>;
};

type Delegate = { findMany(args: any): Promise<any[]>; findUnique(args: any): Promise<any | null>; create(args: any): Promise<any>; update(args: any): Promise<any>; delete?(args: any): Promise<any> };
type Client = { operationalDemoRecord: Delegate; auditEvent?: { create(args: any): Promise<unknown> }; $transaction?: (fn: (tx: any) => Promise<any>) => Promise<any> };

function view(row: any): OperationalDemoRecord { return { id: String(row.id), companyId: String(row.companyId), label: String(row.label), serviceCode: row.serviceCode ?? undefined, status: row.status, createdAt: row.createdAt, updatedAt: row.updatedAt }; }
function eventData(event: OperationalDemoAudit) { return { userId: event.userId, companyId: event.companyId, resource: event.resource, action: event.action, recordId: event.recordId, result: event.result, detail: event.detail }; }

export class PrismaOperationalDemoRepository implements OperationalDemoRepository {
  private readonly client: Client;
  private readonly scoped: TenantRepository;
  constructor(client: Client) {
    this.client = client;
    const delegate = client.operationalDemoRecord;
    // Prisma's composite unique selector is kept behind the scoped adapter boundary.
    this.scoped = new TenantRepository({
      findMany: delegate.findMany.bind(delegate),
      findUnique: (args: any) => delegate.findUnique ? delegate.findUnique({ where: { id_companyId: args.where } }) : delegate.findMany({ where: args.where }).then(rows => rows[0] ?? null),
      create: delegate.create.bind(delegate),
      update: (args: any) => delegate.update({ where: { id_companyId: args.where }, data: args.data }),
    });
  }
  async list(context: TenantContext) { return (await this.scoped.findMany(context.companyId, context.serviceCode ? { serviceCode: context.serviceCode } : { })).map(view); }
  async findVisibleById(context: TenantContext, id: string) { const row = await this.scoped.findUnique(context.companyId, { id }); if (!row) return undefined; if (context.serviceCode && (row as { serviceCode?: string }).serviceCode !== context.serviceCode) return undefined; return view(row); }
  async create(context: TenantContext, record: OperationalDemoRecord, audit?: OperationalDemoAudit) {
    return this.mutate(async tx => view(await new TenantRepository(tx.operationalDemoRecord).create(context.companyId, { id: record.id, label: record.label, serviceCode: context.serviceCode ?? record.serviceCode ?? 'acueducto', status: record.status })), audit, context);
  }
  async updateVisible(context: TenantContext, id: string, data: Partial<OperationalDemoRecord>, audit?: OperationalDemoAudit) {
    return this.mutate(async tx => { const repository = new TenantRepository(tx.operationalDemoRecord); const found = await repository.findUnique(context.companyId, { id }); if (!found) return undefined; if (context.serviceCode && (found as { serviceCode?: string }).serviceCode !== context.serviceCode) return undefined; return view(await repository.update(context.companyId, { id }, data as Record<string, unknown>)); }, audit, context);
  }
  async deleteVisible(context: TenantContext, id: string, audit?: OperationalDemoAudit) {
    if (!this.client.operationalDemoRecord.delete) throw new Error('REPOSITORY_OPERATION_UNAVAILABLE');
    return this.mutate(async tx => { const repository = new TenantRepository(tx.operationalDemoRecord); const found = await repository.findUnique(context.companyId, { id }); if (!found) return false; if (context.serviceCode && (found as { serviceCode?: string }).serviceCode !== context.serviceCode) return false; await tx.operationalDemoRecord.delete({ where: { id_companyId: { id, companyId: context.companyId } } }); return true; }, audit, context);
  }
  private async mutate<T>(work: (tx: any) => Promise<T>, audit: OperationalDemoAudit | undefined, context: TenantContext): Promise<T> {
    const run = async (tx: any) => { const result = await work(tx); if (audit && this.client.auditEvent) await tx.auditEvent.create({ data: eventData({ ...audit, companyId: context.companyId }) }); return result; };
    return this.client.$transaction ? transactional(this.client as any, run) : run(this.client);
  }
}

export class InMemoryOperationalDemoRepository implements OperationalDemoRepository {
  readonly records: OperationalDemoRecord[]; readonly auditEvents: OperationalDemoAudit[];
  constructor(records: OperationalDemoRecord[] = [], auditEvents: OperationalDemoAudit[] = []) { this.records = records; this.auditEvents = auditEvents; }
  async list(context: TenantContext) { return this.records.filter(row => row.companyId === context.companyId && (!context.serviceCode || (row.serviceCode ?? 'acueducto') === context.serviceCode)).map(view); }
  async findVisibleById(context: TenantContext, id: string) { const row = this.records.find(candidate => candidate.id === id && candidate.companyId === context.companyId && (!context.serviceCode || (candidate.serviceCode ?? 'acueducto') === context.serviceCode)); return row && view(row); }
  async create(context: TenantContext, record: OperationalDemoRecord, audit?: OperationalDemoAudit) { const stamped = { ...record, serviceCode: context.serviceCode ?? record.serviceCode ?? 'acueducto' }; this.records.push(stamped); if (audit) this.auditEvents.push(audit); return view(stamped); }
  async updateVisible(context: TenantContext, id: string, data: Partial<OperationalDemoRecord>, audit?: OperationalDemoAudit) { const row = this.records.find(candidate => candidate.id === id && candidate.companyId === context.companyId && (!context.serviceCode || (candidate.serviceCode ?? 'acueducto') === context.serviceCode)); if (!row) return undefined; Object.assign(row, data); if (audit) this.auditEvents.push(audit); return view(row); }
  async deleteVisible(context: TenantContext, id: string, audit?: OperationalDemoAudit) { const index = this.records.findIndex(candidate => candidate.id === id && candidate.companyId === context.companyId && (!context.serviceCode || (candidate.serviceCode ?? 'acueducto') === context.serviceCode)); if (index < 0) return false; this.records.splice(index, 1); if (audit) this.auditEvents.push(audit); return true; }
}

function text(value: unknown, field: string) { if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, 'VALIDATION_ERROR', `${field} is required.`); return value.trim(); }
function notFound(): never { throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'The requested resource was not found.'); }
function audit(context: TenantContext, action: string, id: string | undefined, result: string, detail?: Record<string, unknown>): OperationalDemoAudit { return { userId: context.userId, companyId: context.companyId, resource: 'operational-demo-record', action, recordId: id, result, detail }; }

export class OperationalDemoService {
  private readonly repository: OperationalDemoRepository;
  constructor(repository: OperationalDemoRepository) { this.repository = repository; }
  list(context: TenantContext) { return this.repository.list(context); }
  async detail(context: TenantContext, id: unknown) { const record = await this.repository.findVisibleById(context, text(id, 'id')); if (!record) notFound(); return record; }
  async create(context: TenantContext, body: Record<string, unknown>) { const allowed = ['label']; if (Object.keys(body).some(key => !allowed.includes(key))) throw new ApiError(400, 'VALIDATION_ERROR', 'Unknown fields are not allowed.'); const record = { id: randomUUID(), companyId: context.companyId, label: text(body.label, 'label'), status: 'ACTIVE' as const }; return this.repository.create(context, record, audit(context, 'create', record.id, 'SUCCESS')); }
  async update(context: TenantContext, id: unknown, body: Record<string, unknown>) { const recordId = text(id, 'id'); const allowed = ['label']; if (Object.keys(body).some(key => !allowed.includes(key))) throw new ApiError(400, 'VALIDATION_ERROR', 'Unknown fields are not allowed.'); if (!await this.repository.findVisibleById(context, recordId)) notFound(); const updated = await this.repository.updateVisible(context, recordId, { label: text(body.label, 'label') }, audit(context, 'update', recordId, 'SUCCESS')); if (!updated) notFound(); return updated; }
  async remove(context: TenantContext, id: unknown) { const recordId = text(id, 'id'); const removed = await this.repository.deleteVisible?.(context, recordId, audit(context, 'delete', recordId, 'SUCCESS')); if (!removed) notFound(); return { deleted: true }; }
  async action(context: TenantContext, id: unknown, actionName: unknown) { const recordId = text(id, 'id'); const action = text(actionName, 'action'); const record = await this.repository.findVisibleById(context, recordId); if (!record) notFound(); if (action !== 'complete') throw new ApiError(400, 'VALIDATION_ERROR', 'Unsupported action.'); if (record.status !== 'ACTIVE') throw new ApiError(409, 'BUSINESS_RULE_VIOLATION', 'Only active records can be completed.'); const updated = await this.repository.updateVisible(context, recordId, { status: 'INACTIVE' }, audit(context, 'complete', recordId, 'SUCCESS')); if (!updated) notFound(); return updated; }
}
