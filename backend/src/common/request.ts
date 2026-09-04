import { randomUUID } from 'node:crypto';

export const REQUEST_ID_HEADER = 'x-request-id';
export const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export function requestId(input?: string | string[]): string {
  const value = Array.isArray(input) ? input[0] : input;
  return value && REQUEST_ID_PATTERN.test(value) ? value : randomUUID();
}

export function requestIdFromHeaders(headers: Record<string, string | string[] | undefined>): string {
  return requestId(headers[REQUEST_ID_HEADER] ?? headers['X-Request-Id']);
}
