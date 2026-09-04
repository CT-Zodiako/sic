export type Environment = Record<string, string | undefined>;

export class ConfigurationError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super(`Missing required environment variables: ${missing.join(', ')}`);
    this.name = 'ConfigurationError';
    this.missing = missing;
  }
}

/** Validates bootstrap configuration without ever including secret values in errors. */
export function validateEnvironment(
  env: Environment = process.env,
  required: readonly string[] = ['DATABASE_URL'],
): Readonly<Record<string, string>> {
  const missing = required.filter((name) => !env[name]?.trim());
  if (missing.length) throw new ConfigurationError(missing);
  return Object.fromEntries(required.map((name) => [name, env[name]!.trim()]));
}

export function loadConfig(env: Environment = process.env) {
  const values = validateEnvironment(env);
  return Object.freeze({
    ...values,
    nodeEnv: env.NODE_ENV ?? 'development',
    port: Number(env.PORT ?? 3000),
  });
}
