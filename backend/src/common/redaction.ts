const SECRET_KEY = /password|passphrase|token|secret|authorization|cookie|credential|private.?key|refresh/i;

export function redact<T>(value: T): T {
  if (Array.isArray(value)) return value.map(redact) as T;
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value as object)) {
      output[key] = SECRET_KEY.test(key) ? '[REDACTED]' : redact(child);
    }
    return output as T;
  }
  return value;
}

export function safeLog<T extends object>(value: T): T { return redact(value); }
