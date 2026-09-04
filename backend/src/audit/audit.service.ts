import { redact } from '../common/redaction.ts';

export type AuditMetadata = Record<string, unknown>;
export type AuditInput = {
  userId?: string;
  companyId?: string;
  resource: string;
  action: string;
  recordId?: string;
  result: string;
  detail?: AuditMetadata;
  ip?: string;
  userAgent?: string;
};

const ALLOWED_METADATA = new Set([
  'changedFields', 'before', 'after', 'route', 'method', 'targetId',
  'companyId', 'permission', 'requestId', 'platformOverride', 'reasonCode',
]);
const AUDIT_FILTER_KEYS = ['userId', 'companyId', 'resource', 'action', 'result'] as const;
type AuditFilter = { userId?: string; companyId?: string; resource?: string; action?: string; result?: string; take?: number; skip?: number };

function metadata(input: AuditMetadata | undefined): AuditMetadata | undefined {
  if (!input) return undefined;
  const selected = Object.fromEntries(Object.entries(input).filter(([key]) => ALLOWED_METADATA.has(key)));
  return redact(selected);
}

function boundedInteger(value: unknown, fallback: number, minimum: number, maximum?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  const integer = Math.trunc(value);
  if (maximum === undefined) return Math.max(integer, minimum);
  return Math.min(Math.max(integer, minimum), maximum);
}

export type AuditDelegate = {
  create(args: { data: Record<string, unknown> }): Promise<unknown>;
  findMany(args: { where?: Record<string, unknown>; orderBy?: Record<string, string>; take?: number; skip?: number }): Promise<unknown[]>;
};

export class AuditService {
  private readonly delegate: AuditDelegate;
  constructor(delegate: AuditDelegate) { this.delegate = delegate; }

  /** The sole application write operation for audit events. There are deliberately no update/delete APIs. */
  append(input: AuditInput): Promise<unknown> {
    return this.delegate.create({ data: {
      userId: input.userId, companyId: input.companyId, resource: input.resource,
      action: input.action, recordId: input.recordId, result: input.result,
      detail: metadata(input.detail), ip: input.ip, userAgent: input.userAgent,
    }});
  }

  read(filter: AuditFilter = {}) {
    const candidate = filter && typeof filter === 'object' ? filter as Record<string, unknown> : {};
    const where = Object.fromEntries(AUDIT_FILTER_KEYS
      .filter((key) => candidate[key] !== undefined)
      .map((key) => [key, candidate[key]]));
    return this.delegate.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: boundedInteger(candidate.take, 100, 1, 100),
      skip: boundedInteger(candidate.skip, 0, 0),
    });
  }
}

export function auditMetadata(input: AuditMetadata): AuditMetadata | undefined { return metadata(input); }
