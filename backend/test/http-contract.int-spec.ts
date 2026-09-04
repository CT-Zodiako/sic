import assert from 'node:assert/strict';
import test from 'node:test';
import { createApplication } from '../src/app.ts';
import { problem } from '../src/common/errors.ts';

const representativeProblems = {
  400: ['VALIDATION_ERROR', 'The request is invalid.'],
  401: ['UNAUTHENTICATED', 'Authentication is required.'],
  403: ['PERMISSION_DENIED', 'You do not have permission to perform this request.'],
  404: ['RESOURCE_NOT_FOUND', 'The requested resource was not found.'],
  409: ['DUPLICATE_RESOURCE', 'The requested resource conflicts with an existing resource.'],
} as const;

for (const [statusText, [code, detail]] of Object.entries(representativeProblems)) {
  const status = Number(statusText);
  test(`problem contract supports ${status} responses`, async () => {
    const requestId = `request-${status}`;
    const response = await createApplication().handle(`/v1/missing-${status}`, { headers: { 'x-request-id': requestId } });
    assert.equal(response.status, status);
    assert.deepEqual(response.body, problem(status, code, detail, requestId));
    assert.equal(response.headers?.['x-request-id'], requestId);
    assert.equal(response.headers?.['content-type'], 'application/json');
  });
}

test('health and problem responses preserve request IDs', async () => {
  const response = await createApplication().handle('/v1/health', { headers: { 'x-request-id': 'health-request' } });
  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok' });
  assert.equal(response.headers?.['x-request-id'], 'health-request');
});

test('API is versioned and unknown routes do not leak details', async () => {
  const response = await createApplication().handle('/health');
  assert.equal(response.status, 404);
  assert.equal((response.body as any).code, 'RESOURCE_NOT_FOUND');
  assert.equal(JSON.stringify(response.body).includes('password'), false);
});
