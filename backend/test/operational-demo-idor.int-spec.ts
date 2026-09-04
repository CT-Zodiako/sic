import assert from 'node:assert/strict';
import test from 'node:test';
import { InMemoryOperationalDemoRepository, OperationalDemoService } from '../src/operational-demo/operational-demo.service.ts';
import { TenantContext } from '../src/tenancy/context.ts';

test('operational demo never exposes or mutates another company record', async () => {
  const repository = new InMemoryOperationalDemoRepository([{ id: 'company-b-record', companyId: 'company-b', label: 'B', status: 'ACTIVE' }]);
  const service = new OperationalDemoService(repository);
  const companyA = new TenantContext({ userId: 'user-a', companyId: 'company-a' });
  await assert.rejects(() => service.detail(companyA, 'company-b-record'), (error: any) => error.status === 404 && error.code === 'RESOURCE_NOT_FOUND');
  await assert.rejects(() => service.update(companyA, 'company-b-record', { label: 'stolen' }), (error: any) => error.status === 404);
  await assert.rejects(() => service.remove(companyA, 'company-b-record'), (error: any) => error.status === 404);
  assert.equal(repository.records[0].label, 'B');
});
