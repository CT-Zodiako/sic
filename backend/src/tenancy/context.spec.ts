import assert from 'node:assert/strict';
import test from 'node:test';
import { TenantContext, validateCompanyConsistency } from './context.ts';

test('tenant context rejects missing and mismatched company headers', () => {
  assert.throws(() => validateCompanyConsistency(undefined, {}), (error: any) => error.code === 'COMPANY_CONTEXT_REQUIRED');
  assert.throws(() => validateCompanyConsistency('company-a', { companyId: 'company-b' }), (error: any) => error.code === 'COMPANY_CONTEXT_MISMATCH');
  assert.equal(validateCompanyConsistency('company-a', { companyId: 'company-a' }), 'company-a');
});

test('tenant context is immutable and carries only request identity', () => {
  const context = new TenantContext({ userId: 'u1', companyId: 'company-a', membershipId: 'm1' });
  assert.deepEqual(context.companyId, 'company-a');
  assert.throws(() => (context as any).companyId = 'company-b', TypeError);
});
