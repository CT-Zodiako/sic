import { createHash, randomBytes, randomUUID } from 'node:crypto';

export type SessionRecord = { id: string; userId: string; refreshTokenHash: string; expiresAt: number; revokedAt?: number; rotatedFromId?: string; usedAt?: number };
export type SessionAudit = (event: { action: string; userId?: string; sessionId?: string; result: string; reasonCode?: string }) => void;
export type SessionRepository = {
  create(record: SessionRecord): Promise<SessionRecord>;
  findByTokenHash(hash: string): Promise<SessionRecord | undefined>;
  findById(id: string): Promise<SessionRecord | undefined>;
  update(id: string, data: Partial<SessionRecord>): Promise<SessionRecord | undefined>;
};

export class InMemorySessionRepository implements SessionRepository {
  readonly records = new Map<string, SessionRecord>();
  async create(record: SessionRecord) { this.records.set(record.id, record); return record; }
  async findByTokenHash(hash: string) { return [...this.records.values()].find((entry) => entry.refreshTokenHash === hash); }
  async findById(id: string) { return this.records.get(id); }
  async update(id: string, data: Partial<SessionRecord>) { const current = this.records.get(id); if (!current) return undefined; Object.assign(current, data); return current; }
}

export type SessionDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  findUnique(args: { where: Record<string, unknown> }): Promise<unknown>;
  update(args: { where: Record<string, unknown>; data: Record<string, unknown> }): Promise<unknown>;
};

/** Prisma adapter used by the production composition root; tokens never leave hashed storage. */
export class PrismaSessionRepository implements SessionRepository {
  private readonly delegate: SessionDelegate;
  constructor(delegate: SessionDelegate) { this.delegate = delegate; }

  async create(record: SessionRecord) { return this.toRecord(await this.delegate.create({ data: this.toData(record) })); }
  async findByTokenHash(refreshTokenHash: string) { return this.toRecord(await this.delegate.findUnique({ where: { refreshTokenHash } })); }
  async findById(id: string) { return this.toRecord(await this.delegate.findUnique({ where: { id } })); }
  async update(id: string, data: Partial<SessionRecord>) { return this.toRecord(await this.delegate.update({ where: { id }, data: this.toData(data) })); }

  private toData(record: Partial<SessionRecord>): Record<string, unknown> {
    return {
      ...(record.id === undefined ? {} : { id: record.id }),
      ...(record.userId === undefined ? {} : { userId: record.userId }),
      ...(record.refreshTokenHash === undefined ? {} : { refreshTokenHash: record.refreshTokenHash }),
      ...(record.expiresAt === undefined ? {} : { expiresAt: new Date(record.expiresAt * 1000) }),
      ...(record.revokedAt === undefined ? {} : { revokedAt: record.revokedAt == null ? null : new Date(record.revokedAt * 1000) }),
      ...(record.usedAt === undefined ? {} : { usedAt: record.usedAt == null ? null : new Date(record.usedAt * 1000) }),
      ...(record.rotatedFromId === undefined ? {} : { rotatedFromId: record.rotatedFromId ?? null }),
    };
  }

  private toRecord(value: unknown): SessionRecord | undefined {
    if (!value) return undefined;
    const record = value as Record<string, unknown>;
    const seconds = (field: unknown) => field instanceof Date ? Math.floor(field.getTime() / 1000) : Number(field);
    return {
      id: String(record.id), userId: String(record.userId), refreshTokenHash: String(record.refreshTokenHash),
      expiresAt: seconds(record.expiresAt),
      ...(record.revokedAt ? { revokedAt: seconds(record.revokedAt) } : {}),
      ...(record.usedAt ? { usedAt: seconds(record.usedAt) } : {}),
      ...(record.rotatedFromId ? { rotatedFromId: String(record.rotatedFromId) } : {}),
    };
  }
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export class SessionService {
  readonly sessions: Map<string, SessionRecord>;
  readonly repository: SessionRepository;
  private readonly ttlSeconds: number;
  private readonly audit?: SessionAudit;
  constructor(ttlSeconds = 60 * 60 * 24 * 30, audit: SessionAudit | undefined = undefined, repository?: SessionRepository) {
    if (!repository) throw new Error('SESSION_REPOSITORY_REQUIRED');
    this.ttlSeconds = ttlSeconds; this.audit = audit; this.repository = repository;
    this.sessions = repository instanceof InMemorySessionRepository ? repository.records : new Map();
  }

  async create(userId: string, now = Math.floor(Date.now() / 1000)) {
    const id = randomUUID(); const token = randomBytes(48).toString('base64url');
    const session = await this.repository.create({ id, userId, refreshTokenHash: hashToken(token), expiresAt: now + this.ttlSeconds });
    return { session, token };
  }

  async rotate(token: string, now = Math.floor(Date.now() / 1000)) {
    const current = await this.repository.findByTokenHash(hashToken(token));
    if (!current || current.expiresAt <= now || current.revokedAt || current.usedAt) {
      if (current && (current.revokedAt || current.usedAt)) {
        await this.repository.update(current.id, { revokedAt: now });
        this.audit?.({ action: 'refresh_reuse_denied', userId: current.userId, sessionId: current.id, result: 'DENIED', reasonCode: 'REFRESH_REUSE' });
        throw new Error('REFRESH_REUSE');
      }
      throw new Error('INVALID_REFRESH');
    }
    await this.repository.update(current.id, { usedAt: now, revokedAt: now });
    const next = await this.create(current.userId, now);
    await this.repository.update(next.session.id, { rotatedFromId: current.id });
    next.session.rotatedFromId = current.id;
    this.audit?.({ action: 'refresh_rotated', userId: current.userId, sessionId: next.session.id, result: 'SUCCESS' });
    return next;
  }

  async revoke(sessionId: string, now = Math.floor(Date.now() / 1000)) {
    const session = await this.repository.findById(sessionId);
    if (session && !session.revokedAt) { await this.repository.update(sessionId, { revokedAt: now }); this.audit?.({ action: 'logout', userId: session.userId, sessionId, result: 'SUCCESS' }); }
  }

  async validate(sessionId: string, userId: string, now = Math.floor(Date.now() / 1000)) {
    const session = await this.repository.findById(sessionId);
    if (!session || session.userId !== userId || session.expiresAt <= now || session.revokedAt) throw new Error('SESSION_REVOKED');
    return session;
  }
}

export { hashToken };
