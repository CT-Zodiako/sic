# Implementation Tasks: Multi-tenant Platform Administration

Implement a secure, demonstrable multi-tenant administration slice through independently reviewable strict-TDD work units. The repository is greenfield; paths below are target paths and may be created by the owning work unit.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 4,800–6,800 authored lines across 13 slices |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 → PR 2 → PR 3 → PR 4 → PR 5 → PR 6 → PR 7 → PR 8 → PR 9 → PR 10 → PR 11 → PR 12 → PR 13 |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

## Chain Plan

Use stacked PRs to `main`; each PR targets the immediately preceding merged slice, contains its tests and operational notes, and must remain at or below 400 additions plus deletions. Rebase/retarget if a diff includes an ancestor's changes. Each PR description must state its predecessor, successor, focused test result, runtime result (or `N/A`), and rollback boundary.

| PR | Work unit and dependencies | Budget | Finish / rollback boundary |
|---|---|---:|---|
| 1 | Tooling scaffold; none | 300–380 | Executable monorepo and test commands; revert scaffold files only. |
| 2 | PostgreSQL/Prisma schema; PR 1 | 330–400 | Empty DB migration and invariant tests; forward-fix migration after data exists. |
| 3 | Common HTTP, configuration, database, audit primitive; PR 1–2 | 320–390 | Safe errors/request IDs/transactional append; revert modules, never delete audit rows. |
| 4 | Authentication and sessions; PR 3 | 350–400 | Login/refresh/logout and session validation; revoke issued sessions rather than deleting history. |
| 5 | Per-request tenancy, authorization, and tenant repository; PR 2–4 | 350–400 | Context/policy/scoped query contract; revert module plus its tests. |
| 6 | Current-user context and recursive menu read; PR 4–5 | 320–390 | Companies, selection, context/menu response; revert endpoints/services. |
| 7 | Platform administration: users, companies, memberships; PR 3–5 | 360–400 | Explicit platform-admin mutations with audit; forward-fix data changes. |
| 8 | Platform roles, permissions, assignments, and menu administration; PR 5, 7 | 360–400 | RBAC/menu configuration mutations with audit; forward-fix configuration. |
| 9 | Tenant operational-demo and privileged support access; PR 3–5 | 300–380 | Scoped demo resource and IDOR evidence; revert fixture endpoints/data only. |
| 10 | Angular runtime, Material foundation, auth/session, transport; PR 1, 4 | 360–400 | Bootstrapped authenticated shell and focused core tests; revert frontend core slice. |
| 11 | Angular company context, recursive menu, guards, action controls; PR 6, 10 | 360–400 | Validated-context navigation and focused UI tests; revert context/navigation slice. |
| 12 | Angular platform-admin and operational-demo screens; PR 7–11 | 380–400 | Demonstrable administration flow and bounded browser smoke; revert feature routes/screens. |
| 13 | Cross-browser security E2E, seed, CI, operations docs; PR 1–12 | 360–400 | Repeatable full two-company proof; revert only E2E/seed/CI assets. |

## Implementation Work Units

### PR 1 — Establish executable strict-TDD scaffold

- [x] **RED → GREEN → TRIANGULATE → REFACTOR:** Create failing smoke tests first at `backend/test/app.e2e-spec.ts` and `frontend/src/app/app.component.spec.ts`; scaffold `backend/` NestJS and `frontend/` Angular applications, root workspace manifests, lint/format configuration, Docker PostgreSQL test/development configuration, and CI workflow targets; make `npm run test:backend`, `npm run test:frontend`, `npm run test:integration`, `npm run lint`, and `npm run build` executable (the integration command may initially prove database reachability); triangulate clean-install, test, lint, build, and ephemeral-PostgreSQL runs; refactor scripts into documented root commands. **Acceptance evidence:** exact command output is recorded and both initial tests pass. **Dependencies:** none. **Estimate:** 300–380 lines. **Rollback:** revert only root tooling, `backend/`, `frontend/`, and container/CI scaffold files. <!-- sdd-owner: implementation -->

### PR 2 — Add immutable, constrained PostgreSQL foundation

- [x] **RED → GREEN → TRIANGULATE → REFACTOR:** Write failing ephemeral-PostgreSQL integration tests in `backend/test/database/schema-invariants.int-spec.ts` for UUID/timestamptz mappings, unique membership and role-permission links, role-scope checks, same-company membership-role trigger rejection, platform-role-only assignment trigger rejection, tenant `company_id`/composite indexes, menu cycle rejection, and application-role denial of `UPDATE`/`DELETE` on audit rows; implement `backend/prisma/schema.prisma`, append-only `backend/prisma/migrations/*`, restricted runtime/migration roles, and Prisma configuration; triangulate each invariant with valid and invalid rows plus an empty-database migration apply; refactor migration SQL and test factories for clear invariant names. **Acceptance evidence:** `npm run test:integration -- schema-invariants` passes against a fresh PostgreSQL database and SQL review confirms no RLS is enabled. **Dependencies:** PR 1. **Estimate:** 330–400 lines. **Rollback:** before data, revert migration; after data, use a reviewed forward-fix migration and preserve `audit_events`. <!-- sdd-owner: implementation -->

### PR 3 — Provide API safety and audit primitives

- [x] **RED → GREEN → TRIANGULATE → REFACTOR:** Add failing tests under `backend/src/common/**/*.spec.ts`, `backend/src/audit/**/*.spec.ts`, and `backend/test/http-contract.int-spec.ts` for environment validation, `/v1` routing, DTO whitelist rejection, request IDs, RFC-9457 problem bodies, secret redaction, and transactional success/denial audit append; implement `backend/src/common/` config/errors/request middleware, `backend/src/database/` Prisma transaction helpers, and exclusive `backend/src/audit/` append/read primitives with allowlisted metadata; triangulate 400/401/403/404/409 contracts and transaction rollback proving a failed mutation leaves no success audit; refactor shared error and audit builders. **Acceptance evidence:** focused unit and integration commands pass; logs/problem responses contain request IDs but no passwords or tokens. **Dependencies:** PR 1–2. **Estimate:** 320–390 lines. **Rollback:** revert common/database/audit application modules only; never update or delete appended audit rows. <!-- sdd-owner: implementation -->

### PR 4 — Build identity and revocable session security

- [x] **RED → GREEN → TRIANGULATE → REFACTOR:** Start with failing `backend/src/auth/**/*.spec.ts` and `backend/test/auth-session.int-spec.ts` covering credential failure, JWT claims limited to `sub`/`sid`/time claims, expiry/issuer/audience checks, hashed opaque refresh storage, one-time rotation lineage, reuse denial, logout revocation, and server-session denial on the next access request; implement `/v1/auth/login`, `/refresh`, `/logout`, `/me`, `JwtAuthGuard`, session service, password hashing, secure refresh-cookie configuration, and login/session audit events; triangulate valid, expired, revoked, rotated, and malformed-token cases; refactor token/cookie/error helpers and remove any authorization claim from token payloads. **Acceptance evidence:** integration tests prove refresh reuse and revoked sessions receive stable denial codes. **Dependencies:** PR 3. **Estimate:** 350–400 lines. **Rollback:** disable auth routes or revert auth module; revoke issued sessions rather than deleting session/audit history. <!-- sdd-owner: implementation -->

### PR 5 — Make tenancy and authorization authoritative per request

- [x] **RED → GREEN → TRIANGULATE → REFACTOR:** Add failing unit/integration tests in `backend/src/authorization/**/*.spec.ts`, `backend/src/tenancy/**/*.spec.ts`, and `backend/test/authorization-tenancy.int-spec.ts` for missing/malformed/mismatched `X-Company-Id`, inactive membership, same-company active-role union, inactive/expired grants, cross-company non-grants, explicit platform assignment evaluation, ANY/ALL policies, role-name-only denial, and next-request revocation; implement policy decorators/guards, `TenantContext`, header/body consistency validation, current-state permission resolver, and a tenant repository adapter whose APIs always inject `companyId` and prohibit unscoped tenant lookups; triangulate unauthenticated versus forbidden versus tenant-safe not-visible behavior and platform override opt-in; refactor policy/tenant test factories and context interfaces. **Acceptance evidence:** `npm run test:integration -- authorization-tenancy` proves no JWT role/permission authority and no cross-company grant. **Dependencies:** PR 2–4. **Estimate:** 350–400 lines. **Rollback:** revert authorization/tenancy modules and do not introduce unscoped Prisma calls in dependent services. <!-- sdd-owner: implementation -->

### PR 6 — Expose validated companies, context, and filtered menu

- [x] **RED → GREEN → TRIANGULATE → REFACTOR:** Write failing tests for `backend/src/companies/`, `backend/src/menu/`, and `backend/test/me-context-menu.int-spec.ts` covering active-company-only lists, auditable selection, required context header, under-two-second normal-context measurement, three-level recursive filtering, stable order, ANY default/ALL explicit links, hidden unauthorized branches, route-less ancestor retention, and non-navigable routed parents; implement `/v1/me/companies`, `/v1/me/active-company`, `/v1/me/authorization-context`, recursive menu evaluator, bounded pagination/query limits, and context-selection audit; triangulate two companies with different permission sets and a verifier failure that denies rather than returns stale context; refactor menu tree assembly and response DTOs to omit denied permission details. **Acceptance evidence:** API integration test demonstrates the complete filtered context response and records a non-flaky timing measurement below two seconds in normal local conditions. **Dependencies:** PR 4–5. **Estimate:** 320–390 lines. **Rollback:** revert current-user/menu read endpoints and services; no authorization state is persisted in session claims. <!-- sdd-owner: implementation -->

### PR 7 — Administer users, companies, and memberships securely

- [x] **RED → GREEN → TRIANGULATE → REFACTOR:** Create failing `backend/test/platform-identities.int-spec.ts` tests for explicit `platform.admin` authorization, role-name-only denial, validated user/company creation, active membership establishment/deactivation, active-membership-only `/me/companies`, mass-assignment rejection, duplicate conflicts, authorization-sensitive denied audit, and next-request membership revocation; implement `backend/src/users/`, `backend/src/companies/`, and membership portions of `/v1/platform/{users,companies,memberships}` with DTOs, pagination, declared platform policy, transaction-plus-audit mutations, and OpenAPI decorators; triangulate authorized, unauthenticated, non-platform, invalid-input, and duplicate cases; refactor shared platform resource DTO/service patterns. **Acceptance evidence:** tests prove no identity or role-name bypass and membership deactivation immediately invalidates a live user's company request. **Dependencies:** PR 3–5. **Estimate:** 360–400 lines. **Rollback:** revert platform endpoint/module code; correct created records with audited forward operations, not destructive history removal. <!-- sdd-owner: implementation -->

### PR 8 — Administer RBAC and menu configuration

- [x] **RED → GREEN → TRIANGULATE → REFACTOR:** Add failing integration tests in `backend/test/platform-rbac-menu.int-spec.ts` for company-role creation, platform-role assignment separation, role-permission add/remove, same-company membership-role assignment, trigger/service scope rejection, permission catalog handling, menu ordering/nesting/cycle failure, authorization audit, and immediate role/permission/platform grant revocation; implement `backend/src/roles/`, `backend/src/permissions/`, and platform menu mutation endpoints under `/v1/platform/{roles,permissions,menu}` using the PR 5 policy and PR 3 audit transaction contracts; triangulate valid/invalid role scopes, assignment companies, ANY/ALL menu modes, and live-session revocation; refactor mutation validation and audit metadata allowlists. **Acceptance evidence:** database plus API suites prove a company role cannot grant across companies and removed grants fail on the next protected request. **Dependencies:** PR 5 and PR 7. **Estimate:** 360–400 lines. **Rollback:** revert endpoint/module additions; repair configuration only through audited forward mutations and retain audit history. <!-- sdd-owner: implementation -->

### PR 9 — Demonstrate tenant-safe operational access

- [x] **RED → GREEN → TRIANGULATE → REFACTOR:** Write failing `backend/src/operational-demo/**/*.spec.ts` and `backend/test/operational-demo-idor.int-spec.ts` tests for company-scoped list/detail/create/update/action policy, header/path mismatch denial before lookup, cross-tenant detail/update/delete indistinguishable 404, direct action denial despite client bypass, applicable business-rule denial, and explicit audited `platform.admin` support override; implement `backend/src/operational-demo/` only through `TenantContext` and the scoped repository adapter, with route-level explicit override metadata and mutation/privileged-access audit; triangulate absent versus Company-B-ID responses, ordinary tenant access, and platform support access with a valid company header; refactor fixture policies and response shaping. **Acceptance evidence:** IDOR suite proves no cross-tenant disclosure or mutation and privileged access has its required audit record. **Dependencies:** PR 3–5. **Estimate:** 300–380 lines. **Rollback:** remove only operational-demo routes/module and fixture records; preserve audits. <!-- sdd-owner: implementation -->

### PR 10 — Establish the real Angular runtime, Material foundation, login, and HTTP security core

- [x] **RED:** Add TestBed tests at `frontend/src/app/core/bootstrap.spec.ts`, `router.spec.ts`, `http-client.transport.spec.ts`, and `frontend/src/app/features/auth/login.component.spec.ts` for standalone providers, redirects/outlet, typed response/error mapping, in-memory tokens, login failure/success, and logout transitions. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Implement `frontend/src/main.ts`, `frontend/src/app/app.config.ts`, `core/routes.ts`, `app.component.ts`, `core/http-client.transport.ts`, `core/auth.store.ts`, typed auth client, auth/response interceptors, and `features/auth/login.component.ts`; add Angular Material/CDK dependencies and `frontend/src/styles.css`. Preserve `HttpContext`/`COMPANY_SCOPED`, bearer attachment, serialized refresh, no company header for auth/platform requests, and fail-closed error routing. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE → REFACTOR:** Run `npm run test:frontend -- core` and the frontend build; add `frontend/e2e/auth-smoke.spec.ts` for one concurrent-401 refresh and refresh-failure logout; extract only tested helpers and document CSP/proxy boundaries. **Acceptance evidence:** clean startup reaches the authenticated shell and core tests pass. **Dependencies:** PR 1 and PR 4. **Estimate:** 360–400 lines. **Rollback:** revert frontend runtime/Material/transport/auth files only. <!-- sdd-owner: implementation -->

### PR 11 — Deliver Material company context, recursive menu, guards, and action controls

- [x] **RED:** Add TestBed tests at `frontend/src/app/features/company-context/company-context.store.spec.ts`, `company-selector.component.spec.ts`, `frontend/src/app/shared/navigation-menu.component.spec.ts`, and `frontend/src/app/core/guards/*.spec.ts` for selection/loading/403 invalidation, synchronous stale clearing, three-level filtering, route-less ancestors, routed-parent navigation, keyboard/focus/live announcements, and redirects. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Implement `features/company-context/company-context.store.ts`, typed context client, `company-selector.component.ts`, no-company/access-denied states, `shared/navigation-menu.component.ts`, `auth.guard.ts`, `company-context.guard.ts`, `permission.guard.ts`, and `permission-action.directive.ts`; attach `X-Company-Id` only for marked tenant requests and never authorize from UI state. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE → REFACTOR:** Verify Company A/B differences, manually entered unauthorized routes, post-revocation 403, and no stale permissions with focused tests and `frontend/e2e/context-navigation.spec.ts`; then refine skip-link, focus restoration, responsive/reduced-motion, and status primitives. **Acceptance evidence:** keyboard-operable navigation fails closed while direct backend authorization remains decisive. **Dependencies:** PR 6 and PR 10. **Estimate:** 360–400 lines. **Rollback:** revert context/navigation/guard/action-control files only. <!-- sdd-owner: implementation -->

### PR 12 — Add Material platform-administration and operational-demo screens

- [x] **RED:** Add TestBed/client tests under `frontend/src/app/features/platform-admin/**/*.spec.ts` and `frontend/src/app/features/operational-demo/**/*.spec.ts` for `platform.admin` route protection, reactive validators, table/dialog semantics, focus/error feedback, mutation refresh, denied-action feedback, tenant action visibility, and safe 403/404 mapping. Define `frontend/e2e/administration-demo.spec.ts`: login and company selection are setup prerequisites; this slice owns UI creation/refresh assertions, while cross-company security and revocation remain PR 13. <!-- sdd-owner: implementation -->
- [x] **GREEN:** Implement typed facades and Material components under `frontend/src/app/features/platform-admin/` and `operational-demo/`; compose admin regions for users, companies, memberships, roles/permissions, and menu, plus scoped list/create/edit/complete demo actions. Use only PR 11 guards/directive, whitelist DTO fields, and keep authorization in backend APIs. <!-- sdd-owner: implementation -->
- [x] **TRIANGULATE → REFACTOR:** Verify admin/non-admin, Company A/B, successful list/context refresh, direct denied actions, light/dark contrast-safe tokens, labels, keyboard/focus restoration, and `aria-live` errors in frontend tests and bounded browser smoke. **Acceptance evidence:** browser UI creates company/user/membership/role/permission/menu configuration and observes refreshed context without treating hidden controls as security. **Dependencies:** PR 7–11. **Estimate:** 380–400 lines. **Rollback:** revert feature routes/screens/facades; reverse created configuration through audited APIs. <!-- sdd-owner: implementation -->

### PR 13 — Prove operations, isolation, and release readiness

- [x] **RED → GREEN → TRIANGULATE → REFACTOR:** Add browser/API E2E under `backend/test/e2e/` and `frontend/e2e/` for two-company menu/action differences, same-company role union, direct HTTP denial, missing/mismatched header, IDOR 404, next-request revocation, refresh reuse, audit immutability, and context latency; implement test-only seed, factories, CI orchestration, `README.md`, and `docs/operations/multi-tenant-platform-administration.md`. Consume PR 10–12 smoke boundaries and own clean-checkout orchestration, cross-company security assertions, and full release evidence. **Acceptance evidence:** CI records migration, seed, all suites, and browser matrix; rollback removes only E2E/seed/docs/CI assets and never audit history. **Dependencies:** PR 1–12. **Estimate:** 360–400 lines. **Rollback:** revert E2E/seed/docs/CI assets; use audited forward fixes for database recovery. <!-- sdd-owner: implementation -->

## Parent Lifecycle Actions

- [x] After each PR slice is applied, start or reuse one bounded review of that slice’s stated security boundary, clean diff, exact focused-test result, runtime result, and rollback boundary before advancing to its successor. **Disposition:** bounded receipt-driven reviews were intentionally not run because receipt-driven review mode was disabled by explicit user decision; this is not a review approval claim. <!-- sdd-owner: parent -->
- [x] After PR 13 is applied, perform the release gate using the full E2E/security matrix, migration-on-empty-database proof, two-company operational demo, and documentation review; record any production-deferred decision as a separate follow-up rather than expanding this chain. **Disposition:** final release gate passed: backend 57/57, frontend 22/22, Playwright/system Chrome 5/5, integration 6/6 with fresh migrations, Prisma validate, lint/build/seed/runtime checks, and docs/CI review. Production-deferred follow-ups are historical PR2–PR9 partial strict-TDD evidence, the bundle warning, and deployment/runtime production prerequisites. <!-- sdd-owner: parent -->

## Completion Evidence

The change is complete only when all 13 implementation work units are merged in order, every focused RED/GREEN/TRIANGULATE/REFACTOR sequence has recorded command output, the full suites run against ephemeral PostgreSQL, the browser E2E proof covers two companies and next-request revocation, and audit history remains append-only through rollout and rollback exercises.
