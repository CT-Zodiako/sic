# Proposal: Access Configuration Demo

**Status:** proposed — awaiting confirmation of the proposal-question round.

## Intent

Create a real Angular Material configuration module and a demonstrable end-to-end permission workflow for the greenfield multi-tenant platform. The slice must make the authorization model understandable in the UI while proving that the backend, not menu visibility, is the security authority.

Only authenticated users with the explicit `platform.admin` permission may configure access. The system must never authorize configuration because of a username, email address, identity attribute, or role name. Access follows this chain:

```text
user → active company membership → one or more company roles → permissions → menus/actions
```

The demonstration will show the same user receiving different menus and actions in two companies, including both frontend hiding and backend denial when access is disabled or absent.

## Product outcome

A platform administrator can configure a permission-driven tenant access model and immediately demonstrate its result:

1. Define or inspect a permission catalog.
2. Create or update company-scoped roles and attach permissions.
3. Assign one or more roles to a user within a company membership.
4. Build a nested menu tree and attach menu entries to permissions.
5. Enable or disable permissions, role permissions, memberships, roles, menu entries, or action access according to lifecycle rules.
6. Switch the demonstration user between Company A and Company B.
7. See authorized menus and action controls change with the active company.
8. Attempt a direct unauthorized action and receive backend rejection with no state change.
9. Inspect immutable audit evidence for configuration and authorization-sensitive events.

## Scope

### In scope

- A standalone Angular Material platform-configuration module with accessible tables, forms, dialogs, validation, loading, empty, error, and access-denied states.
- A configuration shell available only when the current user has `platform.admin`.
- Permission catalog management or catalog administration view, including unique permission codes, resource/action labels, descriptions, and active/inactive state.
- Initial demonstrable action catalog:
  - `operational-demo.read`
  - `operational-demo.action`
  - `operational-demo.create`
  - `operational-demo.update`
  - `operational-demo.delete`
- Company management sufficient to create and distinguish Company A and Company B, with active/inactive lifecycle state.
- Company membership management, including activation/deactivation and safe removal of a company from the user's selectable contexts.
- Company-scoped role management, including role name, description, status, permission assignments, and prevention of duplicate active assignments.
- User-to-company-role assignments supporting one or more active roles per membership. Direct user-to-menu or direct user-to-permission assignments are explicitly excluded from the model.
- Recursive menu-tree management with parent/child relationships, ordering, optional route, active/inactive state, and menu-permission assignments. Multiple permissions use OR by default; AND is explicit where needed.
- Permission-driven enable/disable lifecycle behavior. Disabled permissions and disabled authorization links must stop granting access on the next protected request; disabled menu entries must not be rendered or navigable.
- A demonstration screen with read and action controls mapped to the operational-demo permissions. The UI hides or disables unavailable controls, while direct calls to protected backend operations are rejected even if controls or requests are manipulated.
- Two-company demonstration data and acceptance flow in which one user has different roles/effective permissions in Company A and Company B, and no role or permission leaks across companies.
- Immutable audit records for configuration changes, role and membership changes, menu-permission changes, enable/disable events, company-context changes, successful protected actions, and denied authorization-sensitive calls. Records include actor, company where applicable, action, target, timestamp, and outcome.
- Immediate revocation semantics: authorization changes take effect on the next protected request without requiring logout, a new login, or a client restart.
- Backend validation of authentication, active `X-Company-Id` context, active membership, effective permissions, tenant ownership, and applicable business rules for every protected operation.

### Non-goals

- Direct user menu assignments or direct user permission grants.
- Company-admin authority to configure roles, permissions, memberships, menus, or platform configuration; this slice is `platform.admin`-only.
- Field-level permissions, configurable approval workflows, organizational units, external identity providers, native mobile clients, or production-grade identity recovery.
- Business-domain workflows beyond the minimal operational-demo read/create/update/delete/action behavior needed to prove authorization.
- Treating Angular route guards, hidden buttons, disabled controls, or menu configuration as backend security.
- Final ORM/database selection, deployment architecture, or implementation-level API/schema design in this proposal.
- Code, scaffolding, or implementation tasks; those belong to later approved SDD phases.

## Affected areas

| Area | Impact |
|---|---|
| Angular frontend | Adds a real Material administration experience, permission-aware navigation, forms, action states, and two-company demo screens. |
| NestJS backend | Adds or formalizes protected configuration and demo operations, fail-closed authorization, tenant isolation, and revocation checks. |
| Authorization model | Establishes user → membership → roles → permissions → menus/actions as the only access path. |
| Audit/support | Makes access configuration, denials, and privileged operations traceable and immutable. |
| Tenant users | Their visible menu and available actions vary by active company and current active role assignments. |
| Future modules | Can reuse the permission catalog and menu/action linkage without adding user-specific exceptions. |

## Product rules and lifecycle

- `platform.admin` is the sole authority for configuration and is itself an explicit permission.
- Effective permissions are the union of active permissions on all active roles assigned through the active company membership.
- A role assigned in Company A grants nothing in Company B.
- An active membership is required before a company can be selected or used in a protected company-scoped request.
- Menu visibility is derived from effective permissions: route-less ancestors may remain visible when an authorized descendant exists; a routed parent requires its own permission to navigate.
- A menu entry does not imply permission for every action on its screen.
- Disabling a permission, role permission link, role assignment, membership, role, company, menu entry, or action link must fail closed and be reflected in subsequent context/menu responses and backend checks.
- Historical audit records are retained and cannot be edited or deleted through ordinary administration flows.
- Cross-company lookup, update, and delete attempts must not disclose or modify another company’s records.

## Success criteria

- A `platform.admin` user can configure the complete chain without any direct user-menu or user-permission assignment.
- A non-`platform.admin` user, including one with a misleading role name such as `platform_admin`, cannot access configuration endpoints or screens.
- The demonstration user sees different effective permissions, menu branches, and action controls after switching between Company A and Company B.
- A user with `operational-demo.read` but without create/update/delete/action can read the demo and cannot see those controls; direct backend calls for them are rejected.
- Disabling a previously granted permission or assignment hides/removes the corresponding UI capability and causes the next direct protected call to fail without reauthentication.
- Menu parents, nested descendants, ordering, OR/AND permission semantics, and inactive entries behave predictably and fail closed.
- Every configuration mutation and tested authorization decision produces the required immutable audit event.
- No tested request can use a Company A role, menu, or record to gain or disclose Company B access.
- The Angular Material module provides usable validation, keyboard/focus behavior, responsive states, and clear feedback for success, denial, empty data, and loading/failure paths.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| UI visibility is mistaken for authorization | Test direct manipulated calls against backend guards and verify no mutation on denial. |
| Platform configuration becomes a privilege-escalation path | Require explicit `platform.admin`, validate every configuration operation, and audit both success and denial. |
| Cross-company role leakage | Resolve permissions only from the active membership and validate `X-Company-Id` on every protected request. |
| Disabling access leaves stale sessions authorized | Revalidate or invalidate authorization state so the next protected request reflects lifecycle changes. |
| Menu configuration becomes inconsistent or cyclic | Validate parent references, cycles, ordering, inactive ancestors, and permission composition before saving. |
| Demo proves only a happy path | Include two companies, multiple roles, missing permissions, disabled access, direct calls, and empty/no-membership states. |
| Audit data is incomplete or mutable | Centralize event creation, require actor/context/outcome fields, and protect records from functional modification. |

## Rollback

This is a greenfield capability. Before release, rollback is cancellation of the change with no production data impact. After release, deploy the prior frontend/backend release or disable the configuration and demo routes while preserving authorization and audit records. Do not delete configured roles, permissions, memberships, menu history, or audit evidence as part of rollback. Any data migration rollback requires a later approved design.

## Open questions

- Should the permission catalog be platform-owned and read-only after seeding, or may `platform.admin` users create/deactivate arbitrary permission codes?
- Is “disable” soft deactivation only, or should deletion ever be allowed for unused roles, links, menu entries, and companies?
- Should disabled menu/action links be hidden only, disabled with an explanation, or vary by security-sensitive action?
- What is the required maximum revocation latency and the chosen invalidation/versioning mechanism once the backend is scaffolded?
- What audit detail and retention policy is required for before/after configuration values, denied calls, and privileged operational-demo access?
- Is the two-company demo seeded automatically for development/demo environments, or created through the configuration UI during the demonstration?

## Proposal question round

These questions are intended to improve the PRD/proposal by uncovering business rules, implications, edge cases, and product tradeoffs—not implementation mechanics. Please answer, skip, correct the framing, or request a second round:

1. Should `platform.admin` remain the only configuration authority for the first release, including membership and company changes, or should any future company-admin boundary be reserved explicitly as a later phase?
2. For disabled permissions and assignments, should the product always hide unavailable controls, or should low-risk actions show a disabled control and explanation while security-sensitive actions remain hidden?
3. What is the desired demo story for the same user across Company A and Company B: which role/permission differences must be visible to stakeholders, and should the demo include a third no-access company state?
4. Which audit evidence is essential for acceptance—configuration before/after values, denied direct calls, or only actor/company/action/outcome—and how long must it remain retained?

Current assumptions needing confirmation are that the catalog includes the five `operational-demo.*` permissions above, authorization is strictly role-based through company membership, disabled access takes effect on the next protected request, and both UI hiding and backend denial are required.
