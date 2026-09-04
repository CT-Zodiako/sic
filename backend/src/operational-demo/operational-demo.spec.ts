import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryOperationalDemoRepository, OperationalDemoService } from './operational-demo.service.ts';
import { TenantContext } from '../tenancy/context.ts';

test('operational demo scopes list and detail to the tenant context', async () => {
  const repository = new InMemoryOperationalDemoRepository([
    { id: 'a', companyId: 'company-a', label: 'A', status: 'ACTIVE' },
    { id: 'b', companyId: 'company-b', label: 'B', status: 'ACTIVE' },
  ]);
  const service = new OperationalDemoService(repository);
  const context = new TenantContext({ userId: 'u', companyId: 'company-a' });
  assert.deepEqual((await service.list(context)).map(record => record.id), ['a']);
  await assert.rejects(() => service.detail(context, 'b'), (error: any) => error.status === 404);
});

test('operational demo action applies its business rule', async () => {
  const repository = new InMemoryOperationalDemoRepository([{ id: 'a', companyId: 'c', label: 'A', status: 'INACTIVE' }]);
  const service = new OperationalDemoService(repository);
  await assert.rejects(() => service.action(new TenantContext({ userId: 'u', companyId: 'c' }), 'a', 'complete'), (error: any) => error.code === 'BUSINESS_RULE_VIOLATION');
});
