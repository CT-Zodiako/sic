import { randomUUID } from 'node:crypto';
import { ApiError } from '../common/errors.ts';
import { transactional } from '../database/transactions.ts';

export type ServiceRecord = { id: string; code: string; name: string; description?: string; status?: 'ACTIVE' | 'INACTIVE'; createdAt?: Date; updatedAt?: Date };
export type AssignmentRecord = { id: string; companyId: string; serviceId: string; status?: 'ACTIVE' | 'INACTIVE'; assignedAt?: Date };
export type CompanyRef = { id: string; name: string; status?: 'ACTIVE' | 'INACTIVE' };
export type AssignmentView = { id: string; companyId: string; companyName: string; serviceId: string; serviceCode: string; serviceName: string; status?: 'ACTIVE' | 'INACTIVE' };
export type EnabledService = { code: string; name: string };
type AuditEvent = Record<string, unknown> | ((result: AssignmentRecord | ServiceRecord) => Record<string, unknown>);

export type ServiceRepository = {
  listServices(): Promise<ServiceRecord[]>;
  findService(id: string): Promise<ServiceRecord | undefined>;
  createService(data: ServiceRecord, audit?: Record<string, unknown>): Promise<ServiceRecord>;
  updateService(id: string, data: Partial<ServiceRecord>, audit?: AuditEvent): Promise<ServiceRecord | undefined>;
  listAssignments(): Promise<AssignmentRecord[]>;
  findAssignment(id: string): Promise<AssignmentRecord | undefined>;
  findAssignmentByPair(companyId: string, serviceId: string): Promise<AssignmentRecord | undefined>;
  createAssignment(data: AssignmentRecord, audit?: Record<string, unknown>): Promise<AssignmentRecord>;
  updateAssignment(id: string, data: Partial<AssignmentRecord>, audit?: AuditEvent): Promise<AssignmentRecord | undefined>;
  findCompany(id: string): Promise<CompanyRef | undefined>;
};

type AuditDelegate = { create(args: { data: Record<string, unknown> }): Promise<unknown> };
type PrismaClientLike = { service: any; companyService: any; company: any; auditEvent?: AuditDelegate; $transaction?: (fn: (tx: any) => Promise<unknown>) => Promise<unknown> };

function serviceOf(value: any): ServiceRecord { return { id: String(value.id), code: String(value.code), name: String(value.name), description: value.description ?? undefined, status: value.status, createdAt: value.createdAt, updatedAt: value.updatedAt }; }
function assignmentOf(value: any): AssignmentRecord { return { id: String(value.id), companyId: String(value.companyId), serviceId: String(value.serviceId), status: value.status, assignedAt: value.assignedAt }; }
function companyOf(value: any): CompanyRef { return { id: String(value.id), name: String(value.name), status: value.status }; }
function auditData(event: Record<string, unknown>) { return { userId: event.userId, companyId: event.companyId, resource: event.resource, action: event.action, recordId: event.recordId, result: event.result, detail: event.detail }; }

export class InMemoryServiceRepository implements ServiceRepository {
  readonly services: ServiceRecord[]; readonly assignments: AssignmentRecord[]; readonly companies: CompanyRef[];
  constructor(services: ServiceRecord[] = [], assignments: AssignmentRecord[] = [], companies: CompanyRef[] = []) { this.services = services; this.assignments = assignments; this.companies = companies; }
  async listServices() { return [...this.services].sort((a, b) => a.code.localeCompare(b.code)); }
  async findService(id: string) { return this.services.find(service => service.id === id); }
  async createService(data: ServiceRecord) { this.services.push(data); return data; }
  async updateService(id: string, data: Partial<ServiceRecord>) { const item = this.services.find(service => service.id === id); if (!item) return undefined; Object.assign(item, data); return item; }
  async listAssignments() { return [...this.assignments].sort((a, b) => a.id.localeCompare(b.id)); }
  async findAssignment(id: string) { return this.assignments.find(assignment => assignment.id === id); }
  async findAssignmentByPair(companyId: string, serviceId: string) { return this.assignments.find(assignment => assignment.companyId === companyId && assignment.serviceId === serviceId); }
  async createAssignment(data: AssignmentRecord) { this.assignments.push(data); return data; }
  async updateAssignment(id: string, data: Partial<AssignmentRecord>) { const item = this.assignments.find(assignment => assignment.id === id); if (!item) return undefined; Object.assign(item, data); return item; }
  async findCompany(id: string) { return this.companies.find(company => company.id === id); }
}

/** Prisma adapter. Mutations use an interactive transaction so the audit insert commits atomically. */
export class PrismaServiceRepository implements ServiceRepository {
  private readonly client: PrismaClientLike;
  constructor(client: PrismaClientLike) { this.client = client; }
  async listServices() { return (await this.client.service.findMany({ orderBy: [{ code: 'asc' }] })).map(serviceOf); }
  async findService(id: string) { const found = await this.client.service.findUnique({ where: { id } }); return found ? serviceOf(found) : undefined; }
  async createService(data: ServiceRecord, audit?: Record<string, unknown>) { return this.mutate(async (tx: any) => serviceOf(await tx.service.create({ data: { id: data.id, code: data.code, name: data.name, description: data.description, status: data.status } })), audit); }
  async updateService(id: string, data: Partial<ServiceRecord>, audit?: AuditEvent) { return this.mutate(async (tx: any) => { const found = await tx.service.findUnique({ where: { id } }); if (!found) return undefined; return serviceOf(await tx.service.update({ where: { id }, data })); }, audit); }
  async listAssignments() { return (await this.client.companyService.findMany({ orderBy: [{ assignedAt: 'asc' }] })).map(assignmentOf); }
  async findAssignment(id: string) { const found = await this.client.companyService.findUnique({ where: { id } }); return found ? assignmentOf(found) : undefined; }
  async findAssignmentByPair(companyId: string, serviceId: string) { const found = await this.client.companyService.findUnique({ where: { companyId_serviceId: { companyId, serviceId } } }); return found ? assignmentOf(found) : undefined; }
  async createAssignment(data: AssignmentRecord, audit?: Record<string, unknown>) { return this.mutate(async (tx: any) => assignmentOf(await tx.companyService.create({ data: { id: data.id, companyId: data.companyId, serviceId: data.serviceId, status: data.status } })), audit); }
  async updateAssignment(id: string, data: Partial<AssignmentRecord>, audit?: AuditEvent) { return this.mutate(async (tx: any) => { const found = await tx.companyService.findUnique({ where: { id } }); if (!found) return undefined; return assignmentOf(await tx.companyService.update({ where: { id }, data })); }, audit); }
  async findCompany(id: string) { const found = await this.client.company.findUnique({ where: { id } }); return found ? companyOf(found) : undefined; }
  private async mutate<T extends object>(mutation: (tx: any) => Promise<T>, event?: AuditEvent): Promise<T> { const work = async (tx: any) => { const result = await mutation(tx); const eventData = result === undefined ? undefined : typeof event === 'function' ? event(result as never) : event; if (eventData && tx.auditEvent) await tx.auditEvent.create({ data: auditData(eventData) }); return result; }; return this.client.$transaction ? transactional(this.client as any, work) : work(this.client); }
}

const required = (value: unknown, field: string) => { if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, 'VALIDATION_ERROR', `${field} is required.`); return value.trim(); };
const unknown = (body: Record<string, unknown>, allowed: string[]) => { const keys = Object.keys(body).filter(key => !allowed.includes(key)); if (keys.length) throw new ApiError(400, 'VALIDATION_ERROR', `Unknown fields: ${keys.join(', ')}.`); };
const code = (value: unknown) => { const normalized = required(value, 'code').toLowerCase(); if (!/^[a-z0-9][a-z0-9-]*$/.test(normalized)) throw new ApiError(400, 'VALIDATION_ERROR', 'code is invalid.'); return normalized; };
const status = (value: unknown) => { if (value !== 'ACTIVE' && value !== 'INACTIVE') throw new ApiError(400, 'VALIDATION_ERROR', 'status is invalid.'); return value; };
const duplicate = (error: unknown): never => { if ((error as any)?.code === 'P2002') throw new ApiError(409, 'DUPLICATE_RESOURCE', 'The requested resource already exists.'); throw error; };

export class ServicesService {
  private readonly repository: ServiceRepository; private readonly audit?: (event: Record<string, unknown>) => void | Promise<void>;
  constructor(repository: ServiceRepository = new InMemoryServiceRepository(), audit?: (event: Record<string, unknown>) => void | Promise<void>) { this.repository = repository; this.audit = audit; }
  list() { return this.repository.listServices(); }
  async listAssignments(): Promise<AssignmentView[]> { const records = await this.repository.listAssignments(); const views: AssignmentView[] = []; for (const record of records) views.push(await this.view(record)); return views; }
  /** Enabled services of a company: active assignment plus active service. Visualization only; fail-closed. */
  async listEnabled(companyId: string): Promise<EnabledService[]> {
    const records = await this.repository.listAssignments();
    const enabled: EnabledService[] = [];
    for (const record of records) {
      if (record.companyId !== companyId || record.status === 'INACTIVE') continue;
      const service = await this.repository.findService(record.serviceId);
      if (!service || service.status === 'INACTIVE') continue;
      enabled.push({ code: service.code, name: service.name });
    }
    return enabled.sort((a, b) => a.name.localeCompare(b.name));
  }
  async create(body: Record<string, unknown>, actorId?: string) {
    unknown(body, ['code', 'name', 'description']);
    const service: ServiceRecord = { id: randomUUID(), code: code(body.code), name: required(body.name, 'name'), description: body.description == null ? undefined : String(body.description), status: 'ACTIVE' };
        if ((await this.repository.listServices()).some(existing => existing.code === service.code)) throw new ApiError(409, 'DUPLICATE_RESOURCE', 'A service with this code already exists.');
    const event = { userId: actorId, resource: 'service', action: 'create', recordId: service.id, result: 'SUCCESS', detail: { after: { code: service.code, name: service.name, status: 'ACTIVE' } } };
    try { const result = await this.repository.createService(service, event); await this.audit?.(event); return result; } catch (error) { return duplicate(error); }
  }
  async setStatus(id: unknown, body: Record<string, unknown>, actorId?: string) {
    const serviceId = required(id, 'id'); unknown(body, ['status']); const next = status(body.status);
    const current = await this.repository.findService(serviceId); if (!current) throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Service was not found.');
    const event = { userId: actorId, resource: 'service', action: 'update', recordId: serviceId, result: 'SUCCESS', detail: { before: { status: current.status }, after: { status: next } } };
    const result = await this.repository.updateService(serviceId, { status: next }, event); await this.audit?.(event); return result;
  }
  /** Assignment is fail-closed: both company and service must exist and be active; no duplicate active pairs. */
  async assign(body: Record<string, unknown>, actorId?: string) {
    unknown(body, ['companyId', 'serviceId']);
    const companyId = required(body.companyId, 'companyId'); const serviceId = required(body.serviceId, 'serviceId');
    const company = await this.repository.findCompany(companyId); if (!company) throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Company was not found.');
    if (company.status === 'INACTIVE') throw new ApiError(400, 'VALIDATION_ERROR', 'The company is not active.');
    const service = await this.repository.findService(serviceId); if (!service) throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Service was not found.');
    if (service.status === 'INACTIVE') throw new ApiError(400, 'VALIDATION_ERROR', 'The service is not active.');
    const existing = await this.repository.findAssignmentByPair(companyId, serviceId);
    if (existing && existing.status !== 'INACTIVE') throw new ApiError(409, 'DUPLICATE_RESOURCE', 'The company already has this service.');
    if (existing) {
      const event = { userId: actorId, companyId, resource: 'company-service', action: 'assign', recordId: existing.id, result: 'SUCCESS', detail: { before: { status: existing.status }, after: { status: 'ACTIVE' } } };
      const reactivated = await this.repository.updateAssignment(existing.id, { status: 'ACTIVE' }, event); await this.audit?.(event); return this.view(reactivated!);
    }
    const assignment: AssignmentRecord = { id: randomUUID(), companyId, serviceId, status: 'ACTIVE' };
    const event = { userId: actorId, companyId, resource: 'company-service', action: 'assign', recordId: assignment.id, result: 'SUCCESS', detail: { after: { status: 'ACTIVE' } } };
    try { const result = await this.repository.createAssignment(assignment, event); await this.audit?.(event); return this.view(result); } catch (error) { return duplicate(error); }
  }
  async setAssignmentStatus(id: unknown, body: Record<string, unknown>, actorId?: string) {
    const assignmentId = required(id, 'id'); unknown(body, ['status']); const next = status(body.status);
    const current = await this.repository.findAssignment(assignmentId); if (!current) throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'Assignment was not found.');
    const event = { userId: actorId, companyId: current.companyId, resource: 'company-service', action: 'update', recordId: assignmentId, result: 'SUCCESS', detail: { before: { status: current.status }, after: { status: next } } };
    const result = await this.repository.updateAssignment(assignmentId, { status: next }, event); await this.audit?.(event); return this.view(result!);
  }
  private async view(record: AssignmentRecord): Promise<AssignmentView> {
    const company = await this.repository.findCompany(record.companyId);
    const service = await this.repository.findService(record.serviceId);
    return { id: record.id, companyId: record.companyId, companyName: company?.name ?? record.companyId, serviceId: record.serviceId, serviceCode: service?.code ?? '', serviceName: service?.name ?? record.serviceId, status: record.status };
  }
}
