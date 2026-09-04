export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  code: string;
  detail: string;
  requestId: string;
};

const titles: Record<number, string> = {
  400: 'Bad Request', 401: 'Unauthorized', 403: 'Forbidden',
  404: 'Not Found', 409: 'Conflict', 500: 'Internal Server Error',
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, detail: string) {
    super(detail); this.name = 'ApiError'; this.status = status; this.code = code;
  }
}

export function problem(status: number, code: string, detail: string, requestId: string): ProblemDetails {
  return {
    type: `https://httpstatuses.com/${status}`,
    title: titles[status] ?? 'Error', status, code,
    detail: status >= 500 ? 'An unexpected error occurred.' : detail,
    requestId,
  };
}

export function problemFromError(error: unknown, requestId: string): ProblemDetails {
  if (error instanceof ApiError) return problem(error.status, error.code, error.message, requestId);
  return problem(500, 'INTERNAL_ERROR', 'An unexpected error occurred.', requestId);
}
