# Apply Progress: Access Configuration Demo

## Historical progress from previous apply continuation

The previous apply attempt completed partial authorization/schema hardening, duplicate in-memory assignment protection, authenticated audit/menu reads, frontend platform/operational API updates, operational-demo permission controls, and the initial authenticated shell component. It recorded RED duplicate-assignment coverage, GREEN backend integration coverage (5/5), TRIANGULATE backend (59/59) and frontend (23/23), and a successful frontend build with the pre-existing 951.91 kB versus 500 kB initial-bundle warning. No commit was created. Previously identified gaps were shell route wiring, lifecycle/configuration completion, transactional audit wiring, seed/browser acceptance, documentation, and audit query parsing.

## Structured status consumed

- `changeName`: `access-configuration-demo`
- `artifactStore`: `both`, canonical OpenSpec; OpenSpec directory is authoritative
- `applyState`: `ready`; implementation remains incomplete
- `actionContext`: `repo-local`, workspace `/Users/zodiako/DEV/sic`, allowed edit root `/Users/zodiako/DEV/sic`
- Workload gate: decision needed `No`; chained PRs `Yes`; strategy `stacked-to-main`; budget risk `Medium`.
- CodeGraph was initialized and used for structural inspection.

## Completed in this continuation

### Context shell and acceptance/demo support

- Wired the authenticated root route to `AuthenticatedShellComponent` while preserving the authentication guard.
- Added a dedicated safe access-denied route component.
- Kept company switching and nested permission-filtered navigation in the shared context/shell path.

### Audit query behavior

- Platform audit reads now merge bounded query-string filters (`userId`, `companyId`, `resource`, `action`, `result`, `take`, `skip`) with the existing body abstraction.
- Platform admin facade now loads a bounded read-only audit evidence collection alongside configuration resources.

### Development seed and documentation

- Extended the idempotent development seed to include all five operational-demo permissions and distinct A/B grants (A read/create; B read/update/action).
- Added explicit production hardening and audit retention/archival/legal-hold follow-up documentation.

## Persisted task checkbox updates

Marked complete in `tasks.md`:

- GREEN: idempotent development/demo seed.
- GREEN: authenticated root shell and access-denied behavior.
- Production hardening follow-up documentation.
- Audit retention/archival/purge/legal-hold follow-up documentation.

Parent-owned lifecycle rows remain untouched and deferred.

## Files changed in this continuation

- `frontend/src/app/core/routes.ts`
- `frontend/src/app/core/router.spec.ts`
- `backend/src/app.ts`
- `backend/src/audit/audit.service.spec.ts`
- `frontend/src/app/features/platform-admin/platform-admin.screen.ts`
- `frontend/src/app/shared/navigation-menu.component.ts`
- `backend/prisma/seed.ts`
- `README.md`
- `openspec/changes/access-configuration-demo/tasks.md`

## Strict TDD evidence

| Phase | Evidence |
|---|---|
| RED | Added route identity/access-denied assertions and audit-query coverage before implementation. Existing focused harness remained green because route specs are included through the frontend test glob. |
| GREEN | Wired shell route, safe access-denied component, audit query parsing, audit facade evidence loading, and complete A/B operational permission seed. |
| TRIANGULATE | `npm test --prefix backend` passed 60/60; `npm test --prefix frontend` passed 23/23; direct route test passed 1/1; `npm run seed:dry-run --prefix backend` passed. |
| REFACTOR | `git diff --check` passed; `npm run build --prefix frontend` passed with the known 500 kB initial-bundle warning. No commits created. |

## Remaining implementation tasks

The following implementation-owned task rows remain unchecked and require a subsequent bounded slice: authorization/schema green items, shared transactional audit mutation wiring, complete lifecycle/configuration API routes, operational-demo backend/e2e acceptance, full Material configuration sections/forms, A/B browser flow documentation/evidence, and final triangulation/refactor rows. Exact unchecked rows are retained in `tasks.md`.

## Deviations and risks

- This continuation did not claim completion of the full configuration workflow: the existing screen facade was extended with read-only audit evidence, but dedicated Material sections/forms and lifecycle mutation UI remain incomplete.
- No real browser runner or deployed HTTP acceptance was available; existing bounded frontend smoke/e2e fallback remains the available evidence.
- Frontend build passed after converting the existing navigation menu to a compiler-recognized standalone component and adding its input, with the known initial-bundle budget warning (962.65 kB versus 500 kB).

## Workload / PR boundary

This continuation is a small stacked-to-main slice under the 400 changed-line budget, covering route wiring, audit query parsing, seed completion, and documentation. Parent lifecycle review/receipts and delivery gates are deferred.

## Structured status produced

- `nextRecommended`: `apply`
- `actionContext.warnings`: none
- `deferredParentActions`: parent-owned review/stack ordering/lifecycle gate rows remain deferred.

## Current bounded continuation: Material configuration workflow

### Structured status consumed

- `changeName`: `access-configuration-demo`; canonical authoritative store: OpenSpec (`artifactStore: both`).
- `applyState`: `ready`; `actionContext`: `repo-local`, workspace `/Users/zodiako/DEV/sic`, allowed edit root `/Users/zodiako/DEV/sic`; no warnings.
- Workload gate: decision needed `No`; chained PRs `Yes`; strategy `stacked-to-main`; parent supplied `auto-chain`; this slice remains within the 400-line boundary.
- `nextRecommended`: `apply`. Parent-owned lifecycle actions remain deferred.

### Completed in this continuation

- Added frontend API client PATCH methods for company, role, and permission lifecycle and DELETE for menu-permission links.
- Extended `PlatformAdminScreen` with loading/error/success feedback, safe soft-deactivation methods, and refresh of all configuration collections plus authorization context after mutations.
- Replaced the placeholder admin template with accessible Material cards for users, companies, memberships, roles/permissions, menu items, and read-only audit evidence. Added visible role-permission and menu-permission assignment forms; no direct user-permission or user-menu affordance exists.
- User creation now submits the allow-listed form fields rather than empty placeholder values.
- Added focused frontend RED tests for workflow section coverage and lifecycle PATCH payloads; the persisted Slice 6 RED task is checked.

### Verification evidence

- Focused frontend tests: 25/25 passed (including the new workflow and lifecycle tests).
- Full frontend tests: 25/25 passed.
- `npm run build --prefix frontend`: passed; existing initial bundle warning remains (962.67 kB versus 500 kB budget).
- `git diff --check`: passed. No commit created.

### Exact remaining implementation task rows

The authoritative `tasks.md` still contains unchecked implementation rows for authorization/schema hardening, transactional audit wiring, configuration API completion, operational-demo acceptance, context-shell refinements, the remaining Slice 6 GREEN/TRIANGULATE/REFACTOR work, and Slice 7. The full exact unchecked rows remain in `tasks.md`; this continuation only checked the Slice 6 RED row. Parent-owned rows are unchanged and deferred.

### Blocker / deviation

The frontend can invoke lifecycle PATCH methods, but the current backend router does not expose PATCH handlers for `/v1/platform/companies/:id`, `/v1/platform/roles/:id`, or `/v1/platform/permissions/:id`; corresponding service/repository lifecycle methods are also absent. These controls therefore surface the existing safe API failure message until the parent applies the configuration-API slice. Assignment endpoints already exist. Dedicated child presentational components, reactive dialogs/confirmation, and browser acceptance remain incomplete.

### Skill resolution

`skill_resolution: fallback-path` (global strict-TDD guidance loaded because parent-injected skill paths were not supplied).

## Current continuation: backend configuration API lifecycle slice

### Structured status consumed

- `changeName`: `access-configuration-demo`; authoritative store: OpenSpec (`artifactStore: openspec`); `applyState: ready`; `nextRecommended: apply`.
- `actionContext`: `repo-local`, workspace `/Users/zodiako/DEV/sic`, allowed edit root `/Users/zodiako/DEV/sic`; no warnings.
- Workload gate: decision needed `No`; chained PRs `Yes`; strategy `stacked-to-main`; parent delivery path `auto-chain`; budget risk `Medium`.

### TDD Cycle Evidence

| Task | Test File | Layer | Safety Net | RED | GREEN | TRIANGULATE | REFACTOR |
|---|---|---|---|---|---|---|---|
| Configuration lifecycle PATCH handlers | `backend/test/platform-configuration.int-spec.ts` | Integration | ✅ existing suite | ✅ 2 tests initially failed (404/401) | ✅ focused 2/2 | ✅ admin/non-admin, allow-list, four resources, audit detail | ✅ `git diff --check` |

### Completed tasks and persisted checkbox updates

- Added and checked Slice 3 RED contract coverage for lifecycle API behavior.
- Added and checked Slice 3 GREEN route/service lifecycle coverage for companies, roles, permissions, and menu items.
- Added company, role, and permission soft-status update methods to in-memory and Prisma-capable repositories/services, with allow-listed status payloads and before/after audit detail.
- Added the missing company, role, and permission PATCH routes; existing menu-item PATCH and membership/assignment link routes remain protected by the same request-time platform-admin gate.
- Persisted tasks were re-read after update; completed Slice 3 rows visibly contain `- [x]`.

### Files changed

- `backend/src/app.ts`
- `backend/src/companies/companies.service.ts`
- `backend/src/roles/roles.service.ts`
- `backend/src/permissions/permissions.service.ts`
- `backend/test/platform-configuration.int-spec.ts`
- `backend/package.json`
- `openspec/changes/access-configuration-demo/tasks.md`
- `openspec/changes/access-configuration-demo/apply-progress.md`

### Verification evidence

- Focused lifecycle test: 2/2 passed.
- Full backend suite: 62/62 passed.
- `git diff --check`: passed. No commit created.
- Native bounded attempt acquired and settled `complete` after passing evidence.

### Deviations and remaining work

- No schema or migration change was needed; existing status fields support the lifecycle transition.
- Existing request-time resolver checks remain the authorization authority; no token or long-lived grant cache was added.
- Remaining implementation work is recorded as unchecked rows in authoritative `tasks.md`, including Slice 1/2 triangulation/refactors, operational-demo acceptance, context refinements, remaining Material workflow tests/forms, and Slice 7 browser acceptance. Parent-owned lifecycle rows remain deferred.

### Workload / PR boundary

Assigned boundary: backend configuration API lifecycle PATCH/disable handlers and focused contract tests, stacked-to-main Slice 3. No review, receipt, validation, or delivery gate was launched by sdd-apply.

### Structured status produced

- `nextRecommended`: `parent-lifecycle`.
- `actionContext.warnings`: none.
- Parent-owned review, stack ordering, receipts, and final lifecycle gates remain deferred.

### Skill resolution

`skill_resolution: fallback-path` (global strict-TDD guidance loaded because parent-injected skill paths were not supplied).

## Current continuation: vertical-slice browser wiring

- Fixed `/actions/complete` routing and added backend action authorization/state coverage.
- Allowed explicit platform-admin configuration without a tenant context.
- Wired operational form payloads, role assignment and enable/disable affordances, browser-session auth/context persistence, and real system-Chrome coverage preparation.
- Backend full suite: 65/65 passed; frontend full suite: 26/26 passed; frontend build passed with the existing 963.05 kB initial-bundle warning; seed execution passed.
- Real Playwright system Chrome reaches both screens but remains blocked: Company A’s live authorization-context response exposes only `operational-demo.read` although the database contains the active create link. This Prisma authorization mapping discrepancy must be corrected before claiming browser acceptance.
- Broad secondary CRUD and complete reactive dialogs/forms are explicitly deferred. Parent-owned review, receipts, and lifecycle gates remain deferred.

### TDD Cycle Evidence

| Task | Test File | RED | GREEN | TRIANGULATE |
|---|---|---|---|---|
| Operational action route | `backend/test/e2e/pr13-security.e2e-spec.ts` | Failed 403 | 65/65 passed | Cross-company/business-rule cases |
| Platform admin no-context authority | `backend/test/e2e/pr13-security.e2e-spec.ts` | Failed 400 | Passed | Non-admin suites |
| Operational controls | `frontend/src/app/features/operational-demo/operational-demo.spec.ts` | Written | 26/26 passed | Forbidden/action variants |

### Structured status produced

- `nextRecommended`: `parent-lifecycle`; `actionContext.warnings`: none.
- `skill_resolution`: `fallback-path`.

## Current continuation: live A/B authorization mapping defect

- Traced the Prisma adapter path: `main.ts` constructs `PrismaAuthorizationRepository` over `membership`, `role`, and `platformRoleAssignment`; the schema's `MembershipRole` composite relation correctly keys both `roleId` and `companyId`. Seed relation keys are explicit and idempotent: Company A links its membership to `roleA`, then links `operational-demo.read` and `operational-demo.create`; Company B links `roleB` to read/update/action.
- Root cause was the authorization-context route deriving its returned permission set only by iterating configured menu permission codes. The resolver correctly loaded role grants and enforced them, but non-menu grants were never surfaced to the context response, causing the live A create grant (and B update/action grants) to disappear from the response.
- Added `PermissionResolver.permissionsAsync`, which returns the active, same-company role grants (and explicitly opted-in platform grants) from the request-time authorization state. The context route now uses this authoritative set while retaining menu filtering.
- Added integration coverage proving an active role create grant appears in authorization context even when the menu declares only read.
- Backend tests pass 66/66. Live seeded requests now return A `operational-demo.read` + `operational-demo.create` and B `operational-demo.read` + `operational-demo.update` + `operational-demo.action`; health returns 200.
- Playwright remains a separate environment/browser acceptance issue: the prior real system-Chrome run reached both screens but was blocked by the stale/defective authorization response; rerun is still required for browser evidence. No authorization weakening was used.
- `npm run build --prefix backend` remains unavailable because backend has no `build` script; this is a repository tooling gap, not an authorization failure. Seed dry-run passes.

## Current continuation: Spanish frontend usability slice

- Translated visible frontend copy across login, authenticated shell, company selection, access-denied, platform administration, operational demo, and empty/loading/error/success feedback to Spanish. Technical identifiers, routes, API payloads, and permission codes remain unchanged.
- Redesigned platform administration into ordered Material cards with helper text and responsive spacing: 1 permisos, 2 roles, 3 asignaciones, 4 menús, 5 auditoría. Added name-based selects and lookup labels to avoid raw UUID-heavy presentation, retained user creation, and added confirmation before deactivation.
- Operational demo now has Spanish labels, explanatory copy, empty feedback, and accessible action regions without changing dynamic permission checks.
- Updated focused frontend/e2e expectations for the Spanish contract. `npm run test:frontend` passed 26/26; `npm run build --prefix frontend` passed with the existing initial bundle budget warning; `npm run lint` passed (103 TypeScript files). No commit created.
- Important UX decisions saved to Engram under `frontend-spanish-ux`.
- Skill resolution: `paths-injected` (both injected skill files were read successfully).

## Current continuation: guided platform administration usability slice

- Transformed the platform administration panel into a guided, self-explanatory interface in Spanish: an onboarding panel «Cómo configurar acceso» shows the chain Permiso → Rol → Usuario en empresa → Menú → Acción → Demo with Listo/Pendiente progress states derived from the loaded configuration.
- Every step card now explains «Qué hace», what happens after using it, and a concise example (e.g. `inventory.read`, `/operational-demo`); form fields carry helper hints and empty states end with a «Siguiente paso» action.
- Added status chips (Activo/Inactivo) to permissions, roles, companies, memberships, and menu items; role scope chips distinguish «Toda la plataforma», «Compartido entre empresas» and «Solo una empresa: <nombre>»; the selected current company from `CompanyContextStore` is shown in the top bar.
- Deactivation confirmations now state concrete consequences and reversibility («Nada se borra: puedes reactivarlo después»); destructive actions are grouped in labelled action groups with danger styling and explanatory tooltips. Menu URL editing and all existing mutations/validation are preserved unchanged.
- Added focused frontend tests covering explanatory regions, chain labels, checklist progress, status/scope labels, and consequence-bearing confirmations. `npm run test:frontend` passed 33/33; `npm run build --prefix frontend` passed with the pre-existing initial bundle budget warning (992.40 kB vs 500 kB); `npm run lint` passed (103 TypeScript files). No commit created.
- UX decisions saved to Engram under `platform-admin-guided-ux`.
- Skill resolution: `paths-injected` (both injected skill files were read successfully).
