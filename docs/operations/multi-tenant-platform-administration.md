# Multi-tenant platform administration operations

## Quick path and release gate

For a local proof: `npm install`, `npm run seed:dry-run`, then `npm run test:backend`, `npm run test:frontend`, `npm run test:integration`, `npm run test:e2e`, `npm run lint`, and `npm run build`. Integration starts PostgreSQL, applies migrations to an empty database, and tears it down. The E2E matrix proves two-company menus/actions, same-company role union, direct HTTP denial, header failures, IDOR-safe 404s, revocation on the next request, refresh reuse denial, audit read/write boundaries, and context latency under two seconds.

The development seed is idempotent and requires `SEED_DATABASE=true`; `--dry-run` performs no writes. It is explicitly development/test-only. There is no production seed, bootstrap administrator, or identity-based bypass. Production identity bootstrap is a deferred controlled procedure and must be designed and reviewed separately.

## Configuration and restricted access

Required configuration is supplied by the environment, not committed `.env` files:

- `DATABASE_URL`: runtime database URL.
- `JWT_SECRET`: high-entropy secret managed by the deployment secret store.
- `NODE_ENV`: set to `production` for production; seed execution refuses it.
- `SEED_DATABASE`: set to `true` only for an approved development/test database.

Use separate PostgreSQL credentials: a restricted `sic_runtime` role for application queries and a separate migration owner role for migrations. The runtime role must not own schema objects and must not update or delete `audit_events`; grant only the application table operations required by the release. PostgreSQL RLS is not enabled in this slice; tenant isolation is enforced by mandatory context, scoped queries, composite constraints, and authorization tests.

Run migrations as a controlled pre-deploy step with the migration role. Migrations are append-only. Once data exists, rollback is a reviewed forward-fix migration, never destructive history removal.

## Browser CSP and API proxy boundary

The Angular development server uses `frontend/proxy.conf.json` to forward only `/v1` requests to `http://localhost:3000`; it is a local-development convenience, not a production security boundary. In production, serve the compiled frontend and API behind the same trusted origin (or an explicitly allowlisted reverse proxy) so browser requests keep the `/v1` path and refresh cookies remain scoped to `/v1/auth`.

The production response policy must emit an explicit CSP: `default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'`. Do not add `unsafe-eval`, wildcard sources, or inline script allowances. If the chosen Angular deployment requires an inline style exception, replace it with a nonce/hash approved by the deployment owner rather than broadening the policy. List the exact HTTPS API origin in `connect-src` only when a separate origin is unavoidable. TLS, CORS/origin allowlisting, and CSP are deployment responsibilities; the development proxy does not provide them.

## Security and observability

Deploy API and browser traffic behind TLS with secure, HttpOnly, SameSite refresh cookies, an explicit CORS/origin allowlist, and secret-manager injection. Do not log passwords, access/refresh tokens, cookies, authorization headers, or raw sensitive payloads. Structured logs should carry request ID, actor (when known), validated company (only after validation), route, outcome, and stable error code.

Track authorization-context/menu latency, authorization denials by code, cross-tenant not-visible 404s, audit append failures, refresh rotation/reuse, session revocations, and permission-query latency. Alert on audit append failures and repeated refresh reuse. Audit events are append-only, platform-read authorized, paginated, and filtered; no update/delete API exists.

## Backup, recovery, and rollback

Before production migrations, verify encrypted backups, restore access, retention, and a recovery time objective in the deployment environment. Take a backup before schema changes and test restore into an isolated database. Roll back application code by disabling the affected capability or returning to the last compatible release. Preserve all audit records. Database rollback is forward-fix after data exists; do not drop tables or rewrite audit history.

## Deferred production decisions

Before production release, owners must decide password and credential lifecycle, MFA/identity providers, refresh-cookie and CORS topology, rate limits/account lockout/CSRF, production administrator bootstrap, delegated role governance, soft-delete lifecycle, audit retention/export and outage behavior, operational support boundaries, representative load targets, and whether future scale requires authorization caching or fully designed RLS. These decisions are not silently supplied by the development seed or this runbook.
