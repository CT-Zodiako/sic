import { ApiError } from '../common/errors.ts';

export type TenantContextInput = { userId: string; companyId: string; membershipId?: string; serviceCode?: string };

export class TenantContext {
  readonly userId: string;
  readonly companyId: string;
  readonly membershipId?: string;
  readonly serviceCode?: string;
  constructor(input: TenantContextInput) {
    if (!input.userId || !input.companyId) throw new ApiError(400, 'COMPANY_CONTEXT_REQUIRED', 'A user and company context are required.');
    this.userId = input.userId; this.companyId = input.companyId; this.membershipId = input.membershipId; this.serviceCode = input.serviceCode;
    Object.freeze(this);
  }
}

function one(value: unknown): string | undefined {
  if (Array.isArray(value) || typeof value !== 'string' || !value.trim() || value.includes(',')) return undefined;
  return value.trim();
}

export function validateCompanyConsistency(header: unknown, body: Record<string, unknown> = {}): string {
  const companyId = one(header);
  if (!companyId) throw new ApiError(400, 'COMPANY_CONTEXT_REQUIRED', 'X-Company-Id is required.');
  const bodyCompany = body.companyId === undefined ? undefined : one(body.companyId);
  if (body.companyId !== undefined && (!bodyCompany || bodyCompany !== companyId)) throw new ApiError(400, 'COMPANY_CONTEXT_MISMATCH', 'Header and body company context must match.');
  return companyId;
}

export function tenantContextFromRequest(userId: string, headers: Record<string, unknown>, body: Record<string, unknown> = {}, membershipId?: string) {
  const header = headers['x-company-id'] ?? headers['X-Company-Id'];
  return new TenantContext({ userId, companyId: validateCompanyConsistency(header, body), membershipId });
}
