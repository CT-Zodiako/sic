# SIC — Multi-Tenant Administration

A security-first multi-tenant administration slice built with NestJS, Angular, PostgreSQL, and Prisma.

> **Current status:** the backend and Angular frontend security slice, Material administration screens, and release-readiness checks are implemented. The repository uses a service-level API matrix plus bounded frontend smoke fallback; a real browser runner and deployed HTTP-server proof remain release-environment prerequisites.

## Quick start

### Prerequisites

- Node.js 24+
- npm
- Docker and Docker Compose

### Install dependencies

```bash
npm install
```

### Run the complete verification suite

```bash
npm run test:backend
npm run test:frontend
npm run test:integration
npm run test:e2e
npm run lint
npm run build
```

`test:integration` starts a temporary PostgreSQL 16 container, applies all migrations to an empty database, runs the schema/security checks, and removes the container automatically.

## Local PostgreSQL and seed data

Start the persistent local database:

```bash
docker compose up -d --wait
```

Set the required environment variables in your shell:

```bash
export DATABASE_URL='postgresql://sic:sic@localhost:5432/sic'
export JWT_SECRET='replace-with-a-long-random-development-secret'
export NODE_ENV=development
```

Apply migrations with the local database owner/migration connection:

```bash
for migration in backend/prisma/migrations/*/migration.sql; do
  docker compose exec -T postgres \
    psql -U sic -d sic -v ON_ERROR_STOP=1 < "$migration"
done
```

Load the repeatable development fixtures:

```bash
SEED_DATABASE=true node --experimental-transform-types backend/prisma/seed.ts
```

The seed creates two companies, development users, company-specific roles, permissions, nested menu data, and operational records. It is guarded against production execution and never acts as a production bootstrap mechanism.

To verify the seed command without writing to the database:

```bash
npm run seed:dry-run
```

Stop the local database when finished:

```bash
docker compose down
```

## Development identities

The development seed uses:

| User | Email | Password |
|---|---|---|
| Platform administrator | `admin@sic.test` | `Cambiar1234!` |
| Tenant user | `operaciones@sic.test` | `Cambiar1234!` |

Change these credentials before sharing a development environment. Never use them in production.

## Security model

- Backend authorization is authoritative; frontend visibility is never security.
- Company-scoped requests must provide a validated `X-Company-Id` header.
- Roles and memberships are company-scoped.
- Access tokens contain identity/session claims only, not permissions.
- Refresh tokens are opaque, hashed, rotated once, and revocable server-side.
- Audit events are append-only and protected from runtime update/delete operations.
- Cross-company resource access is intentionally concealed with a safe `404` response.
- `platform.admin` is an explicit permission; there are no identity- or role-name-based bypasses.

## Useful commands

| Command | Purpose |
|---|---|
| `npm run test:backend` | Backend unit and service-level security tests |
| `npm run test:frontend` | Frontend scaffold tests |
| `npm run test:integration` | Fresh PostgreSQL migration and schema checks |
| `npm run test:e2e` | Backend tenant isolation/security matrix (including refresh, revocation, IDOR, audit, and latency) |
| `npm --workspace @sic/frontend exec -- tsx --import @angular/compiler --test e2e/security-matrix.spec.ts` | Bounded browser-runner fallback for company menu/action differences |
| `npm run seed:dry-run` | Validate seed safety without database writes |
| `npm run lint` | Lint TypeScript files |
| `npm run build` | Syntax/build checks for the current scaffold |

## Deferred production hardening

Before production deployment, add environment-specific secure headers, rate limiting, monitoring and alerting, backup/restore drills, migration rollout gates, and operational failure handling. The development seed is never a production migration or bootstrap.

## Audit retention follow-up

Audit events remain append-only and available indefinitely in this release. A separate policy decision must define retention duration, archival and purge authority, legal hold handling, and event-class exceptions; ordinary administration has no update or delete capability.

## Configuration

| Variable | Required | Description |
|---|---:|---|
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `JWT_SECRET` | Yes | High-entropy access-token signing secret |
| `NODE_ENV` | Yes | Use `production` to block the seed |
| `SEED_DATABASE` | Seed only | Must be `true` for non-dry-run development/test seeding |

Do not commit `.env` files, passwords, tokens, cookies, or authorization headers.

## Production prerequisites

Before production use, complete the real Angular/browser runtime, HTTP server bootstrap, deployed-API E2E tests, TLS and CORS configuration, secret management, rate limiting/CSRF decisions, production administrator bootstrap, backup/restore validation, and operational monitoring. See [`docs/operations/multi-tenant-platform-administration.md`](docs/operations/multi-tenant-platform-administration.md).
