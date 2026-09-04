import assert from 'node:assert/strict';
import test from 'node:test';
import { AuditService } from './audit.service.ts';
import { transactional } from '../database/transactions.ts';

test('audit append allowlists and redacts metadata', async () => {
  let created: any;
  const service = new AuditService({ create: async (args) => (created = args.data), findMany: async () => [] });
  await service.append({ resource: 'user', action: 'update', result: 'success', detail: { requestId: 'r', password: 'secret', changedFields: ['name'] } });
  assert.deepEqual(created.detail, { requestId: 'r', changedFields: ['name'] });
});

test('audit read is bounded and ordered without mutation methods', async () => {
  let query: any;
  const service = new AuditService({ create: async () => undefined, findMany: async (args) => (query = args, []) });
  await service.read({ take: 999, companyId: 'c' });
  assert.equal(query.take, 100);
  assert.deepEqual(query.where, { companyId: 'c' });
  assert.deepEqual(query.orderBy, { createdAt: 'desc' });
  assert.equal('update' in service, false);
  assert.equal('delete' in service, false);
});

test('audit read sanitizes runtime bounds and filter keys', async () => {
  let query: any;
  const service = new AuditService({ create: async () => undefined, findMany: async (args) => (query = args, []) });
  await service.read({ take: Number.NaN, skip: Number.POSITIVE_INFINITY, resource: 'user', password: 'secret' } as any);
  assert.equal(query.take, 100);
  assert.equal(query.skip, 0);
  assert.deepEqual(query.where, { resource: 'user' });

  await service.read({ take: 2.9, skip: -4.8 } as any);
  assert.equal(query.take, 2);
  assert.equal(query.skip, 0);
});

test('audit query values are parsed from URL query strings by the application', async () => {
  let query: any;
  const service = new AuditService({ create: async () => undefined, findMany: async (args) => (query = args, []) });
  await service.read({ resource: 'role', take: 3, skip: 2 });
  assert.deepEqual(query.where, { resource: 'role' });
  assert.equal(query.take, 3);
  assert.equal(query.skip, 2);
});

test('transaction rolls back mutation and success audit together', async () => {
  let rolledBack = false;
  const client = { async $transaction(fn: (tx: any) => Promise<unknown>) {
    try { await fn({}); } catch { rolledBack = true; throw new Error('rollback'); }
  }};
  await assert.rejects(() => transactional(client, async () => { throw new Error('mutation failed'); }));
  assert.equal(rolledBack, true);
});
