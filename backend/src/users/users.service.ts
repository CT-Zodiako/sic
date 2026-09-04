import { randomUUID } from 'node:crypto';
import { ApiError } from '../common/errors.ts';
import { PasswordHasher } from '../auth/password.ts';

export type UserAdminRecord = { id: string; email: string; name: string; passwordHash: string; status?: 'ACTIVE' | 'INACTIVE'; createdAt?: Date; updatedAt?: Date };
export type Page<T> = { items: T[]; page: number; pageSize: number; total: number };
export type UserRepository = {
  findMany(args?: { skip?: number; take?: number; where?: Record<string, unknown> }): Promise<UserAdminRecord[]>;
  count?(args?: { where?: Record<string, unknown> }): Promise<number>;
  findByEmail(email: string): Promise<UserAdminRecord | undefined>;
  create(data: UserAdminRecord): Promise<UserAdminRecord>;
  update(id: string, data: Partial<UserAdminRecord>): Promise<UserAdminRecord | undefined>;
};

export class InMemoryUserRepository implements UserRepository {
  private readonly records: UserAdminRecord[];
  constructor(records: UserAdminRecord[] = []) { this.records = records; }
  async findMany(args: { skip?: number; take?: number } = {}) { return this.records.slice(args.skip ?? 0, (args.skip ?? 0) + (args.take ?? this.records.length)); }
  async count() { return this.records.length; }
  async findByEmail(email: string) { return this.records.find(u => u.email.toLowerCase() === email.toLowerCase()); }
  async create(data: UserAdminRecord) { this.records.push(data); return data; }
  async update(id: string, data: Partial<UserAdminRecord>) { const found = this.records.find(u => u.id === id); if (!found) return undefined; Object.assign(found, data); return found; }
}

export class PrismaUserRepository implements UserRepository {
  private readonly delegate: any;
  constructor(delegate: any) { this.delegate = delegate; }
  async findMany(args: any = {}) { return this.delegate.findMany({ ...args, orderBy: { createdAt: 'desc' } }); }
  async count(args: any = {}) { return this.delegate.count(args); }
  findByEmail(email: string) { return this.delegate.findUnique({ where: { email } }); }
  create(data: UserAdminRecord) { return this.delegate.create({ data }); }
  update(id: string, data: Partial<UserAdminRecord>) { return this.delegate.update({ where: { id }, data }); }
}

function pageArgs(input: Record<string, unknown>) {
  const page = Number.isInteger(input.page) && Number(input.page) > 0 ? Number(input.page) : 1;
  const pageSize = Number.isInteger(input.pageSize) && Number(input.pageSize) > 0 && Number(input.pageSize) <= 100 ? Number(input.pageSize) : 20;
  return { page, pageSize, skip: (page - 1) * pageSize };
}
function text(value: unknown, field: string) { if (typeof value !== 'string' || !value.trim()) throw new ApiError(400, 'VALIDATION_ERROR', `${field} is required.`); return value.trim(); }
function rejectUnknown(body: Record<string, unknown>, allowed: string[]) { const unknown = Object.keys(body).filter(k => !allowed.includes(k)); if (unknown.length) throw new ApiError(400, 'VALIDATION_ERROR', `Unknown fields: ${unknown.join(', ')}.`); }

export class UsersService {
  readonly users: UserAdminRecord[]; private readonly repository: UserRepository; private readonly audit?: (event: Record<string, unknown>) => void | Promise<void>;
  constructor(users: UserAdminRecord[] = [], repository?: UserRepository, audit?: (event: Record<string, unknown>) => void | Promise<void>) { this.users = users; this.repository = repository ?? new InMemoryUserRepository(users); this.audit = audit; }
  async list(query: Record<string, unknown> = {}): Promise<Page<UserAdminRecord>> { const p = pageArgs(query); const items = await this.repository.findMany({ skip: p.skip, take: p.pageSize }); const safe = items.map(({ passwordHash: _omitted, ...user }) => user as UserAdminRecord); return { items: safe, page: p.page, pageSize: p.pageSize, total: this.repository.count ? await this.repository.count() : items.length }; }
  async create(body: Record<string, unknown>, actorId?: string) {
    rejectUnknown(body, ['email', 'name', 'password']);
    const email = text(body.email, 'email').toLowerCase(); const name = text(body.name, 'name'); const password = text(body.password, 'password');
    if (await this.repository.findByEmail(email)) throw new ApiError(409, 'DUPLICATE_RESOURCE', 'A user with this email already exists.');
    const user = { id: randomUUID(), email, name, passwordHash: new PasswordHasher().hash(password), status: 'ACTIVE' as const };
    await this.repository.create(user); if (!this.users.some(existing => existing.id === user.id)) this.users.push(user); await this.audit?.({ userId: actorId, resource: 'user', action: 'create', recordId: user.id, result: 'SUCCESS' });
    return { id: user.id, email: user.email, name: user.name, status: user.status };
  }
  async update(id: unknown, body: Record<string, unknown>, actorId?: string) {
    const userId = text(id, 'id'); rejectUnknown(body, ['name', 'password', 'status']);
    const data: Partial<UserAdminRecord> = {}; if (body.name !== undefined) data.name = text(body.name, 'name'); if (body.password !== undefined) data.passwordHash = new PasswordHasher().hash(text(body.password, 'password')); if (body.status !== undefined) { if (body.status !== 'ACTIVE' && body.status !== 'INACTIVE') throw new ApiError(400, 'VALIDATION_ERROR', 'status is invalid.'); data.status = body.status; }
    const updated = await this.repository.update(userId, data); if (!updated) throw new ApiError(404, 'RESOURCE_NOT_FOUND', 'User was not found.'); await this.audit?.({ userId: actorId, resource: 'user', action: 'update', recordId: userId, result: 'SUCCESS' }); return { id: updated.id, email: updated.email, name: updated.name, status: updated.status };
  }
}
