# Design: Real Angular Administration UI

## Technical Approach

Keep the implemented NestJS/Prisma backend and frontend security contracts unchanged: in-memory access tokens, `COMPANY_SCOPED` markers, bearer/company-header interceptors, serialized refresh, fail-closed guards, backend-filtered menus, and authoritative 401/403/404 handling. Replace the render-only scaffold with a real Angular 19 standalone SPA using Angular Material/CDK. The UI remains a typed adapter over existing `/v1` contracts, never an authorization authority.

## Architecture Decisions

| Area | Decision |
|---|---|
| Runtime | `bootstrapApplication`, `app.config.ts`, `provideRouter`, and `provideHttpClient(withInterceptors(...))`; standalone APIs fit the existing scaffold. |
| UI | Material fields, tables, dialogs, snackbars, progress states, and CDK focus utilities provide consistent validation, keyboard, and focus behavior. |
| State | Existing `AuthStore` and `CompanyContextStore` remain the security boundary; signals bridge snapshots. No second permission cache. |
| API | An Angular `HttpClient` transport implements the current `HttpHandler` shape, retaining typed clients and context markers. |

## Data Flow and Boundaries

```text
Login -> AuthApiClient -> HttpClient/interceptors -> API -> AuthStore
Selector -> ContextStore -> select + authorization-context -> Shell/menu
Admin/Demo -> typed adapter -> mutation -> lists/context refresh
```

Company switching clears ID, permissions, and menu synchronously before loading validated context. Mutations refresh affected lists/context. Components never construct authorization headers or authorize API calls.

`AppComponent` owns the Material shell and outlet. `LoginComponent` owns credentials and auth errors. `CompanySelectorComponent` owns selection, loading, no-company, and context-failure states. `NavigationMenuComponent` recursively renders `MenuNode`, linking only `navigable` nodes. `PlatformAdminComponent` composes users, companies, memberships, roles/permissions, and menu-editor regions, each with a Material table/form/dialog and typed facade. `OperationalDemoComponent` owns scoped list/create/edit/complete actions. Shared loading, problem, access-denied, and not-found components standardize failures.

Real `Routes` use `authGuard`, `companyContextGuard`, and `permissionGuard` with existing `anyOf`/`allOf` data. Platform administration requires `platform.admin`; demo routes retain existing permissions. Guards improve navigation only; backend APIs remain protected.

## Accessibility, Theme, and Contracts

Use explicit labels, `aria-live` status/errors, `aria-current`, visible focus, keyboard-operable menus/dialogs, focus restoration, and skip-to-content. Provide light/dark CSS tokens, responsive breakpoints, contrast-safe states, and reduced-motion support; never use color alone for permission state.

The transport maps Angular responses/errors to existing `HttpResponse`/`HttpErrorResponse`. Existing `AuthUser`, `Company`, `AuthorizationContext`, `MenuNode`, admin DTOs, and `DemoRecord` stay canonical. Facades expose `{ value, errors, pending, message }` and whitelist fields. Only context and tenant-demo requests are `COMPANY_SCOPED`; auth/platform requests are not.

## File Changes

| Path | Action |
|---|---|
| `frontend/package.json`, `src/styles.css` | Material/CDK and global theme/accessibility styles. |
| `frontend/src/main.ts`, `src/app/app.config.ts` | Standalone bootstrap, router, HttpClient, providers. |
| `frontend/src/app/app.component.ts`, `core/routes.ts` | Real shell, outlet, redirects, routes. |
| `frontend/src/app/core/http-client.transport.ts` | HttpClient bridge for current adapters. |
| `frontend/src/app/features/{auth,company-context,platform-admin,operational-demo}/**`, `shared/**` | Material screens, facades, forms, menu/action/accessibility primitives. |

## Testing Strategy

TestBed RED tests cover bootstrap, transport mapping, interceptor boundaries, guards, stale-context clearing, refresh serialization, validation, focus/keyboard behavior, recursive menu navigation, mutation refresh, and 403/404 feedback. Browser E2E proves login, two-company menu/action differences, administrator setup, direct-action denial, and post-revocation refresh. Existing backend security/contract suites remain unchanged.

## Threat Matrix

Routing is applicable; document execution/classification, Git selection, commit/push state, and PR command construction are `N/A`: this UI executes no documents or repository commands. Routing safety uses guard and direct-API RED tests.

| Boundary | Applicability |
|---|---|
| Documentation-like paths | N/A — no document execution. |
| Git repository selection | N/A — no Git selection. |
| Commit state | N/A — no commit automation. |
| Push state | N/A — no push automation. |
| PR commands | N/A — no PR command construction. |

## Migration / Rollout

No data migration. Land runtime/Material, then context/navigation, then admin/demo components. Retain adapters until equivalent tests pass; deploy against current backend contracts and roll back with the prior frontend bundle.

## Open Questions

- [ ] Confirm Angular test runner during implementation.
- [ ] Confirm brand palette and production CSP/origin settings before release.
