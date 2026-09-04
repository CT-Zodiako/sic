# Design: Access Configuration Demo

## Status and constraints

This design implements the approved OpenSpec change in `packages/coding-agent`-equivalent repository scope (the current checkout uses `backend/` and `frontend/`), without commits. The approved decisions are: `platform.admin` is the only configuration authority; unavailable controls are hidden; Company A and Company B demonstrate different role-derived permissions; authorization changes apply on the next protected request; audit mutations contain safe before/after data; and retention policy is a follow-up decision, not a reason to omit audit data.

CodeGraph was unavailable in the executor tool surface and `.codegraph/` was absent, so structural inspection used the repository files after that fallback.

## Existing baseline and gaps

- `backend/src/app.ts` already routes platform, context, menu, role, permission, and operational-demo requests, but platform authorization is centralized in `requirePlatformAdmin` and several repositories/services are incomplete for lifecycle updates, assignment integrity, and audit detail.
- `backend/src/authorization/resolver.ts` already computes active membership role grants and platform grants on every call. Keep this request-time resolution; do not cache grants in JWTs or a long-lived process cache.
- `backend/src/tenancy/context.ts` and `TenantRepository` establish the company-header and composite-key isolation boundary. Every company-scoped read/write must continue through that boundary.
- Prisma already models users, companies, memberships, company/platform roles, permissions, menu trees/links, operational records, and audit events. The existing migration adds platform role assignments and menu `ANY`/`ALL` mode.
- `frontend/src/app/features/platform-admin/platform-admin.screen.ts` is a thin state facade plus a partial Material screen: it loads data and exposes a user form, but renders no real configuration workflow. Extend it rather than creating a second admin shell.
- `frontend/src/app/core/routes.ts` already lazy-loads `/platform-admin` with a client-side `platform.admin` guard, but the authenticated root is still a placeholder. Replace the root placeholder with the authenticated shell/context navigation and preserve backend enforcement.
- Operational demo currently renders only create/list/complete and does not bind to the real `CompanyContextStore` in its component constructor. It needs permission-aware CRUD/action controls and context subscription/refresh.
- `AuditService` is already the sole application append/read abstraction and has redaction allow-listing, but the read endpoint and mutation before/after conventions are not yet wired consistently.

## Architecture and data flow

### Authorization boundary

1. Authentication resolves `claims.sub`.
2. `X-Company-Id` is required for company-scoped requests and is checked against any body company identifier.
3. Backend loads the active membership for `(userId, companyId)`, validates user/company/membership lifecycle dates, then joins active membership roles, active role-permission links, and active permissions. Platform grants are resolved separately and only `platform.admin` is used as a platform override.
4. A shared authorization service returns an effective permission set or evaluates one permission with `ANY`/`ALL`. It must fail closed for missing context, mismatched company, inactive entities, unknown permission, invalid route/resource ownership, and stale assignments.
5. The same service protects both configuration routes and operational-demo routes. Angular guards/directives only improve navigation and presentation.

Platform configuration uses the explicit platform grant; it must not infer authority from role names, email, username, company role, or identity attributes. Platform admin endpoints require authenticated user plus `platform.admin`; they may carry a validated company context for audit attribution, but configuration authority itself is platform-scoped.

### API surface

Retain the existing `/v1` convention and add only the smallest missing endpoints:

- `GET/POST/PATCH /v1/platform/users`, `GET/POST/PATCH /v1/platform/companies` (add lifecycle patch).
- `GET/POST/PATCH /v1/platform/memberships`, plus role-assignment endpoints with explicit membership/company validation.
- `GET/POST/PATCH /v1/platform/roles`, `POST/DELETE /roles/:id/permissions`, `POST/DELETE /roles/:id/assignments`, and platform-role assignment only for `PLATFORM` roles.
- `GET/POST/PATCH /v1/platform/permissions`; seeded catalog entries are stable and deactivation is soft.
- `GET/POST/PATCH /v1/platform/menu/modules|items`, `POST/DELETE /menu/items/:id/permissions`; validate parent/module ownership, cycles, active links, and permission mode.
- `GET /v1/platform/audit-events`, protected by explicit `platform.admin`, with bounded filters/pagination and no update/delete route.
- Existing `/v1/me/companies`, `/v1/me/active-company`, `/v1/me/authorization-context`, and `/v1/companies/:companyId/operational-demo-records...` remain the runtime context/action API. Add missing PATCH/DELETE/action coverage and ensure every operation maps to exactly one operational permission.

Return RFC-7807-compatible existing problem responses. Denied requests return safe 403/404 responses and never disclose another company’s record, role, membership, or existence.

### Mutation and audit transaction

Introduce a small shared mutation/audit helper or standardize repository mutation signatures. A successful mutation and its audit insert commit in one transaction. The event includes `userId` (actor), applicable `companyId`, resource/target, action, result, request metadata where available, and redacted `detail` containing `before`, `after`, or `changedFields`. Denials are appended after the authorization decision with a safe `reasonCode`; they must not include cross-company values. Audit writes must not be emitted twice by both repository and service paths.

Audit records remain append-only: no functional update/delete repository methods, and the audit endpoint is read-only. Retention duration, archival, and purge authority are explicitly deferred to a follow-up design; this slice preserves records indefinitely in the application path.

## Backend lifecycle and integrity rules

- Use soft `ACTIVE`/`INACTIVE` transitions. Do not physically delete permissions, roles, links, memberships, companies, menu entries, or audit events in ordinary flows.
- Add/verify database uniqueness for permission code, user/company membership, role-permission, membership-role, and menu-permission. Convert unique violations to 409 and make in-memory repositories match production behavior.
- Assignment service must load both membership and role, require active same-company entities, reject platform roles on memberships, and reject duplicate active assignments. `companyId` must be derived/verified rather than trusted from an arbitrary caller.
- Role permission and menu permission operations must verify referenced entities and preserve historical audit detail when disabled/removed. Disabled links must be excluded by resolver/menu query immediately.
- Menu writes validate parent existence, same module/company policy, no cycle (walk ancestors plus database constraint/transaction), valid `ANY`/`ALL`, and stable ordering. Runtime filtering keeps route-less ancestors only when an authorized descendant exists; routed parents are navigable only when their own requirements pass.
- Operational-demo repositories always query by `(id, companyId)` and list by company. Authorization occurs before mutation; a denied operation must not enter a mutation transaction. Business-rule failures (for example completing inactive records) are audited safely as denied/failed according to the existing error taxonomy.
- Context changes and deactivation invalidate the derived frontend context by reloading companies and authorization context. Since backend resolution is per request, no logout, token refresh, or client restart is required.

## Angular design

Create a real standalone `PlatformAdminComponent` composed of small presentational sections (users/companies, memberships, roles/permissions, menu tree, audit table) backed by the existing `PlatformAdminScreen` facade and API client. Keep one facade state model with `loading`, `saving`, `empty`, `error`, `denied`, and success feedback; do not scatter HTTP calls through templates.

Use Angular Material tables, reactive forms/dialogs, form-field errors, responsive layout, keyboard/focus-safe dialogs, and `aria-live` status regions. Forms send allow-listed payloads and expose uniqueness/conflict errors. Lifecycle controls are explicit soft deactivate actions with confirmation. Audit detail is rendered read-only and redacted by the backend.

Replace the authenticated root placeholder with a shell containing company selector, derived navigation menu, and router outlet. The shell subscribes to `CompanyContextStore`; selecting a company clears old permissions before awaiting, then reloads context/menu and navigates away from invalid routes. Keep `/platform-admin` route guard as UX; backend remains authority. Add an access-denied component with no configuration data leakage.

Update operational-demo to use the injected/shared context store, reload on company changes, map controls to `read/create/update/delete/action`, and hide unavailable security-sensitive controls with `PermissionActionDirective`/`can`. Handle 403 by showing a safe message and reloading context; never treat a hidden button as authorization. Add explicit update/delete/action controls and preserve read-only operation behavior.

## Seed and demonstration data

Add an idempotent development/demo seed, not production-only migration data:

- permissions: `platform.admin` plus the five `operational-demo.*` codes;
- one explicit platform role assigned to the platform administrator user;
- Company A and Company B, one demonstration user, active memberships in both;
- Company A roles split across read/create and optionally a second role for demonstrating union; Company B roles grant read/update/action and omit create/delete;
- operational records owned separately by each company;
- menu module with a route-less parent and nested demo entry plus an admin entry requiring `platform.admin`.

The seed must be safe to run repeatedly (upsert stable codes/names and link keys), must never grant a direct user permission/menu assignment, and must be enabled only by the existing development/demo bootstrap mechanism. Tests should construct deterministic fixtures without depending on global seed order.

## Stacked implementation slices (each target <=400 changed lines)

1. **Authorization and schema hardening** — normalize resolver/platform policy, add lifecycle/uniqueness/assignment checks, missing Prisma migration/schema constraints, and unit tests. No UI. Receipt: cross-company and misleading-role denial plus immediate revocation tests.
2. **Transactional mutation/audit foundation** — centralize audit mutation helper, safe before/after/redaction, denial events, read-only audit query endpoint, and service/repository coverage. Receipt: atomic success, no audit on rolled-back mutation, immutable read-only history.
3. **Configuration API completion** — finish lifecycle CRUD and validation for companies, memberships, roles, permissions, menus, assignments; wire routes and seeded catalog. Receipt: API contract tests for all conflict, inactive, cycle, scope, and tenant cases.
4. **Operational demo backend and seed** — complete protected CRUD/action mapping, ownership checks, privileged-access audit, idempotent A/B fixture. Receipt: read-only, full-grant, cross-company, and revocation e2e tests.
5. **Context shell and navigation** — replace root placeholder, bind company selector/store, authorized nested menu and access-denied route behavior. Receipt: switching A/B clears stale state and changes menus without reload.
6. **Platform admin Material workflow** — expand existing partial component/facade/API into accessible sections, dialogs/forms, lifecycle and assignment flows, audit table, and status states. Receipt: component tests cover validation, loading, empty, failure, denial, success, and refresh.
7. **Demo controls and final acceptance** — bind operational screen to real context, add permission-aware CRUD/action controls, direct-call denial UI, e2e A/B story, and migration/seed documentation. Receipt: browser test proves hidden controls plus manipulated backend denial/no state change.

Keep each slice independently reviewable and mergeable to main. If a slice threatens the line budget, split by backend/API versus frontend while preserving the listed order; do not combine unrelated formatting or generated artifacts.

## Strict TDD strategy

Every slice starts with a failing test and uses the narrowest existing harness (Vitest/unit services, application route tests, Angular component tests, and Playwright e2e). Required test matrix:

- authorization: explicit permission versus role-name spoof, inactive permission/link/role/membership/company, active-date boundaries, ANY/ALL, platform-only access, no-context fail-closed;
- integrity: duplicate links/assignments, cross-company role/membership, cycles, inactive references, no direct user grant paths;
- tenant safety: list/detail/update/delete/action with foreign IDs returns safe denial/not-found and leaves state unchanged;
- audit: actor/company/action/result/target, redacted before/after, denial reason, privileged access, context selection, append-only behavior, transaction atomicity;
- frontend: context reset on switch, menu ancestor semantics, hidden actions, access-denied state, form validation, stale-data avoidance, and refresh after mutation;
- e2e: same user in A/B, read-only direct calls, revocation without re-login, Company B deactivation removal, and audit evidence.

Tests must assert both response and persistent state. Do not weaken tests to accommodate the existing placeholder or mock authorization by username. Run backend tests, frontend tests, type checks, migration validation, and the focused e2e suite after each slice; run the complete suite before delivery.

## Rollout and rollback

Apply additive schema/migration changes before deploying code that uses them; run idempotent seed only in development/demo environments. Deploy backend authorization/audit/API before frontend routes, then enable the UI route. Monitor 403 rates, migration errors, and audit insert failures. Rollback is prior frontend/backend release or route disablement; preserve roles, permissions, configuration history, and audit records. Any retention/purge or destructive migration requires a later approved design.

## Open follow-up

Decide and document audit retention, archival, and purge controls separately, including legal hold, operational access, and whether retention differs by event class. This follow-up must not add ordinary audit update/delete capability or weaken immutable acceptance evidence.
