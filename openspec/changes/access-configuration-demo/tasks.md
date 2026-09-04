# Tasks: Access Configuration Demo

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 1,400–2,200 total, delivered as seven slices of roughly 180–340 changed lines each |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 → PR 7 |
| Delivery strategy | auto-chain |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

## Execution rules

- Execute slices in order; each slice must remain independently reviewable and <=400 changed lines. <!-- sdd-owner: implementation -->
- Use strict TDD in every slice: RED failing test, GREEN minimal implementation, TRIANGULATE broader/negative evidence, then REFACTOR without changing behavior. Record commands and results in the PR description. <!-- sdd-owner: implementation -->
- Preserve request-time, fail-closed authorization and composite company scoping; never add direct user-to-permission or user-to-menu grants. <!-- sdd-owner: implementation -->
- Run the narrowest available backend/frontend harness after each slice; because commands are currently scaffold-dependent, document unavailable commands rather than weakening coverage. <!-- sdd-owner: implementation -->

## Slice 1 — Authorization and schema hardening (PR 1, target 220–340 lines)

**Start:** existing resolver, tenancy context, Prisma schema/migrations, and authorization tests. **Finish:** lifecycle and assignment invariants are enforced at request time and persistence boundaries. **Rollback:** revert only this slice’s additive constraints/service changes; retain no UI dependency.

- [ ] RED: add failing backend tests under `backend/src/authorization/**/*.spec.ts` and `backend/test/**/*.e2e-spec.ts` for explicit `platform.admin` versus spoofed role/name, missing context, inactive permission/link/role/membership/company, active-date boundaries, and ANY/ALL evaluation. <!-- sdd-owner: implementation -->
- [ ] GREEN: update `backend/src/authorization/resolver.ts`, `backend/src/authorization/require-platform-admin.ts`, and related guards/services to resolve active membership → company roles → permissions on every protected request and reject mismatched company context. <!-- sdd-owner: implementation -->
- [ ] GREEN: add/verify relational uniqueness and lifecycle constraints in `backend/prisma/schema.prisma` and `backend/prisma/migrations/*`, with matching in-memory repository behavior and safe conflict responses. <!-- sdd-owner: implementation -->
- [ ] GREEN: enforce assignment integrity in `backend/src/platform/**/*.service.ts` and repositories: same-company active entities only, no platform roles on memberships, no duplicate active links, and no direct user grants. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: test cross-company role/membership attempts, revocation on the next request, tenant ownership, inactive references, and persistence state unchanged after denial. <!-- sdd-owner: implementation -->
- [ ] REFACTOR: centralize permission predicates and normalize problem responses without caching grants in tokens or long-lived process state. <!-- sdd-owner: implementation -->

## Slice 2 — Transactional mutation and audit foundation (PR 2, target 200–320 lines)

**Start:** slice 1 authorization and existing `AuditService`. **Finish:** successful mutations and audit events are atomic, redacted, append-only, and queryable by authorized administrators. **Rollback:** remove helper wiring while preserving existing authorization decisions.

- [ ] RED: add failing tests under `backend/src/audit/**/*.spec.ts` and route/service tests for actor/company/action/target/result, safe before/after or changed fields, denial reason, rollback atomicity, duplicate-write prevention, and forbidden audit update/delete. <!-- sdd-owner: implementation -->
- [ ] GREEN: implement or standardize a shared mutation/audit helper in `backend/src/audit/` and wire `backend/src/platform/**/*.service.ts` mutations so audit insertion commits in the same transaction as the mutation. <!-- sdd-owner: implementation -->
- [ ] GREEN: complete `backend/src/audit/audit.service.ts` redaction allow-listing and append-only semantics; add `GET /v1/platform/audit-events` with explicit platform-admin authorization, bounded filters, pagination, and no mutation routes. <!-- sdd-owner: implementation -->
- [ ] GREEN: emit safe denial events after authorization failures, excluding cross-company values and preserving RFC-7807-compatible responses. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: verify mutation rollback leaves no audit event, successful mutation has exactly one event, denial has no state change, and audit reads cannot modify history. <!-- sdd-owner: implementation -->
- [ ] REFACTOR: consolidate event naming/detail schemas and document that retention, archival, purge, and legal-hold policy are deferred. <!-- sdd-owner: implementation -->

## Slice 3 — Configuration API completion (PR 3, target 260–360 lines)

**Start:** hardened authorization/audit services. **Finish:** platform-admin APIs support complete safe lifecycle configuration. **Rollback:** disable the new routes while retaining schema and audit records.

- [x] RED: add API contract tests under `backend/test/platform/**/*.e2e-spec.ts` for users/companies/memberships/roles/permissions/menu modules/items, assignments, conflicts, inactive references, cycles, ordering, ANY/ALL, and cross-company scope. <!-- sdd-owner: implementation -->
- [x] GREEN: complete controllers/routes in `backend/src/platform/` for `GET/POST/PATCH` users, companies, memberships, roles, permissions; role-permission and membership-role assignment endpoints; and menu module/item plus menu-permission endpoints. <!-- sdd-owner: implementation -->
- [x] GREEN: implement soft ACTIVE/INACTIVE lifecycle transitions, derived company validation, duplicate prevention, menu parent/module ownership and cycle checks, and exclusion of inactive links from context/menu responses. <!-- sdd-owner: implementation -->
- [x] GREEN: ensure every configuration endpoint requires explicit `platform.admin`, audits success and denial, and exposes no direct user permission/menu assignment path. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: assert safe 403/404/409 behavior, no leaked foreign records, no state change on rejected operations, and immediate refreshed authorization after each relevant mutation. <!-- sdd-owner: implementation -->
- [ ] REFACTOR: align DTO validation, controller problem responses, repository interfaces, and endpoint documentation in `backend/README.md` or the existing API documentation location. <!-- sdd-owner: implementation -->

## Slice 4 — Operational demo backend and A/B seed (PR 4, target 200–330 lines)

**Start:** completed configuration API. **Finish:** protected CRUD/action behavior and deterministic two-company demo data prove tenant isolation. **Rollback:** disable demo seed/routes; do not delete audit/configuration history.

- [x] RED: add backend/e2e tests for read-only, full-grant CRUD/action, business-rule failure, cross-company IDs, platform-admin access audit, and revocation without re-login. <!-- sdd-owner: implementation -->
- [x] GREEN: complete `backend/src/operational-demo/` controllers/services/repositories for read/create/update/delete/action, mapping exactly to `operational-demo.*` permissions and querying by `(id, companyId)` before mutation. <!-- sdd-owner: implementation -->
- [x] GREEN: add an idempotent development/demo seed in the existing `backend/prisma/seed*` or bootstrap location for catalog, platform administrator, Company A/B, demo user/memberships/roles, distinct grants, menus, and company-owned records. <!-- sdd-owner: implementation -->
- [ ] GREEN: ensure seed upserts stable keys, is not production migration data, and creates no direct user permission/menu assignment. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: prove A read/create versus B read/update/action, omitted controls’ direct calls fail, foreign records are not disclosed or changed, and deactivated Company B disappears from selectable contexts. <!-- sdd-owner: implementation -->
- [ ] REFACTOR: isolate deterministic test fixtures from global seed order and document demo bootstrap invocation. <!-- sdd-owner: implementation -->

## Slice 5 — Context shell and permission-aware navigation (PR 5, target 180–300 lines)

**Start:** backend context/menu APIs and existing Angular routes/store. **Finish:** authenticated users have safe company-aware shell/navigation with stale context removed on switch. **Rollback:** restore the root placeholder and retain backend protection.

- [ ] RED: add Angular tests under `frontend/src/app/core/**/*.spec.ts` and shell/menu tests for context reset, A/B switch, route-less ancestors, routed-parent permission, ANY/ALL filtering, inactive entries, unauthorized route, and access-denied rendering. <!-- sdd-owner: implementation -->
- [x] GREEN: replace the authenticated root placeholder in `frontend/src/app/` with a shell containing company selector, derived nested menu, router outlet, loading/error/empty states, and an access-denied component. <!-- sdd-owner: implementation -->
- [ ] GREEN: bind `frontend/src/app/core/company-context.store.ts` (or existing context store), clear old permissions before reload, refresh companies/authorization/menu on selection, and navigate away from invalid routes. <!-- sdd-owner: implementation -->
- [ ] GREEN: preserve `/platform-admin` UX guard while ensuring no guard, menu, or client state is treated as backend authorization. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: test same-user A/B navigation and stale-data avoidance without reload, including membership/company deactivation and safe denial with no configuration data. <!-- sdd-owner: implementation -->
- [ ] REFACTOR: keep navigation derivation in one service/facade and add accessible focus/status behavior without duplicating HTTP calls. <!-- sdd-owner: implementation -->

## Slice 6 — Platform administrator Material workflow (PR 6, target 300–390 lines)

**Start:** configuration APIs and shell. **Finish:** existing `PlatformAdminScreen` becomes a complete accessible configuration workflow. **Rollback:** route back to the existing partial screen; retain backend and audit guarantees.

- [x] RED: extend tests beside `frontend/src/app/features/platform-admin/platform-admin.screen.ts` and its API client for loading, empty, validation, conflict, failure, denied, success, refresh, and redacted read-only audit states. <!-- sdd-owner: implementation -->
- [ ] GREEN: expand the existing facade/API client and create the standalone Material sections in `frontend/src/app/features/platform-admin/` for users/companies, memberships, roles/permissions, menu tree, and audit evidence. <!-- sdd-owner: implementation -->
- [ ] GREEN: add reactive forms/dialogs/tables with required/unique validation, confirmation for soft deactivation, allow-listed payloads, keyboard/focus-safe dialogs, responsive layout, and `aria-live` feedback. <!-- sdd-owner: implementation -->
- [ ] GREEN: refresh affected lists and authorization context after mutations; show safe access-denied/error states and never render stale authority as current. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: component tests cover keyboard-accessible success/denial/loading/empty/failure flows and verify there is no UI affordance for direct user-menu or user-permission grants. <!-- sdd-owner: implementation -->
- [ ] REFACTOR: split presentational sections from the single state facade and keep Material imports/styles scoped to this feature. <!-- sdd-owner: implementation -->

## Slice 7 — Demo controls and final acceptance (PR 7, target 220–360 lines)

**Start:** shell, admin workflow, protected demo backend, and seed. **Finish:** browser-verifiable A/B demonstration and release evidence. **Rollback:** disable demo controls/e2e route while preserving backend denial and audit history.

- [x] RED: add focused frontend/e2e tests for `frontend/src/app/features/operational-demo/` and Playwright coverage for hidden read/create/update/delete/action controls, manipulated calls, 403 handling, refresh, and no state change. <!-- sdd-owner: implementation -->
- [x] GREEN: inject/bind the shared context store in the operational-demo screen, reload on company changes, map controls to `read/create/update/delete/action`, hide unavailable security-sensitive controls, and add update/delete/action UI. <!-- sdd-owner: implementation -->
- [ ] GREEN: handle denied direct calls with a safe message and context refresh; retain backend as authority and preserve read-only behavior. <!-- sdd-owner: implementation -->
- [ ] GREEN: add the A/B browser flow and migration/seed/demo documentation under the existing `frontend/e2e/`, `backend/test/`, and project documentation locations. <!-- sdd-owner: implementation -->
- [ ] TRIANGULATE: run backend tests, frontend tests/type checks, migration validation, and focused browser acceptance proving A/B differences, immediate revocation, cross-company denial, audit evidence, and no mutation after manipulated denial. <!-- sdd-owner: implementation -->
- [ ] REFACTOR: remove test/demo-only shortcuts, keep generated artifacts out of the slice, and run the complete available suite before delivery. <!-- sdd-owner: implementation -->

## Deferred hardening and policy follow-ups

- [x] Document production hardening follow-up for deployment configuration, rate limiting, monitoring/alerting, secure headers, backup/restore, migration rollout, and operational failure handling; do not expand the seven slices beyond the demo acceptance boundary. <!-- sdd-owner: implementation -->
- [x] Document a separate audit retention/archival/purge/legal-hold decision with authority and event-class policy; retain append-only records indefinitely through this slice and add no ordinary update/delete capability. <!-- sdd-owner: implementation -->

## Parent lifecycle actions

- [ ] Start or reuse bounded review for each stacked slice and verify each remains within the 400-line budget before apply. <!-- sdd-owner: parent -->
- [ ] Confirm the seven-slice stack is ordered to main and each slice has its own receipt, rollback boundary, and test evidence. <!-- sdd-owner: parent -->
- [ ] After apply, run the lifecycle gate for migrations, seed safety, full tests, browser acceptance, audit immutability, and deferred follow-up capture. <!-- sdd-owner: parent -->
