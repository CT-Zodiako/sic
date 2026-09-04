// Aplica las migraciones SQL en orden antes de arrancar el server.
// Idempotente: registra cada migración aplicada en schema_migrations.
// Corre dentro del contenedor con DATABASE_URL del entorno.
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is required to run migrations.');
  process.exit(1);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

await client.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`);

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'prisma', 'migrations');
const names = readdirSync(migrationsDir).sort();

for (const name of names) {
  const applied = await client.query('select 1 from schema_migrations where name = $1', [name]);
  if (applied.rowCount) {
    console.log(`skip ${name} (already applied)`);
    continue;
  }
  const path = join(migrationsDir, name, 'migration.sql');
  // Sentencias específicas del entorno de desarrollo (roles/grants/ownership).
  // En Cloud SQL el usuario de DATABASE_URL es dueño de todo; estas líneas
  // (ALTER OWNER, GRANT/REVOKE a roles de dev) no aplican y fallan.
  const skip = /^(GRANT |REVOKE |ALTER TABLE \w+ OWNER TO )/i;
  const sql = readFileSync(path, 'utf8')
    .split('\n')
    .filter((line) => !skip.test(line.trimStart()))
    .join('\n');
  console.log(`apply ${name}`);
  await client.query(sql);
  await client.query('insert into schema_migrations (name) values ($1)', [name]);
}

await client.end();
console.log('migrations ok');
