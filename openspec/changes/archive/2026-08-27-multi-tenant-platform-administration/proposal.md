# Proposal: Multi-tenant Platform Administration

**Status:** proposed — proposal-question round completed and approved.

## Intent

Deliver the first visible vertical slice of a multi-tenant business system: a platform administrator can establish users, company-scoped roles, role permissions, and a hierarchical menu, then demonstrate how those assignments control visible navigation and available actions. This makes the authorization model understandable and operable before business-domain modules are introduced.

Today there is no system through which administrators can configure tenant access or prove that a user's company context, roles, permissions, menus, and actions are enforced consistently. The outcome is a demonstrable, secure administration flow in which access changes—including revocation—take effect immediately.

## Scope

### In scope

- Use Angular, NestJS, PostgreSQL, and Prisma for this greenfield slice.
- Authenticate users and identify their active company through `X-Company-Id` on company-scoped requests.
- Create and manage users, companies, active user–company memberships, and company-scoped role assignments.
- Create and manage reusable company-scoped roles; assign and remove permissions from roles; calculate a user's effective permissions as the union of active roles for the active company.
- Create and manage an arbitrarily nested menu and submenu hierarchy, including ordering, activation, routes where applicable, and minimum permission requirements.
- Show authorized menu entries, route availability, and screen actions for the resulting active-company permissions.
- Enforce authorization in the backend for every protected operation, including membership, active-company/header consistency, permission, resource ownership, and applicable business rules.
- Enforce tenant isolation for all tenant-owned data and avoid revealing cross-tenant resource existence.
- Provide `platform_admin` through the explicit, auditable `platform.admin` permission—not through a hard-coded identity or role-name exception—and allow that permission full audited access to operational tenant data outside testing.
- Immediately enforce role, permission, membership, and relevant access revocations on subsequent protected requests.
- Record immutable audit events for login/session-relevant events, company-context changes, user administration, role and permission changes, menu changes, authorization-sensitive access, and platform-administrator access to operational tenant data.

### Non-goals

- Business-domain workflows such as billing, payments, approvals, reporting, or operational record lifecycles beyond the minimal action-availability demonstration.
- External identity providers, self-service password recovery, native mobile applications, field-level permissions, internal organizational hierarchies, and configurable approval workflows.
- A technical design, API contract, schema, implementation task list, application scaffold, or implementation work.
- Relaxing the requirement that the backend is the authorization authority or introducing a hard-coded superuser bypass.

## Product rules and constraints

| Topic | Decision |
| --- | --- |
| Authorization basis | User + active company + active role(s) + permission + business rule. |
| Tenant context | The frontend sends `X-Company-Id`; the backend validates it for every company-scoped protected operation. |
| Role scope | Roles and their assignments are company-scoped; a role grants nothing outside the company context in which it is assigned. |
| Effective permissions | Union the permissions of all active roles assigned to the user in the active company. |
| Menu visibility | A route-less parent appears if at least one descendant is authorized; a parent with its own route additionally needs its own minimum permission to be navigable. |
| Menu permission logic | Multiple linked permissions are OR by default; AND must be explicitly declared. |
| Security authority | Frontend guards and conditional controls improve usability only; backend authorization is decisive. |
| Revocation | Revoked roles, permissions, and memberships must no longer authorize the next protected request. |
| Platform authority | `platform.admin` is an explicit permission with full, audited access to operational tenant data; it is never inferred from a user identity or hard-coded role name. |
| Failure behavior | Missing or unverifiable authorization context denies access safely. |

## Affected areas

| Area | Impact |
| --- | --- |
| Platform administration | Administrators gain user, company, role, permission, and menu configuration workflows. |
| Tenant users | Users receive company-specific navigation and actions based on current active-company assignments. |
| Authorization and tenant data | Every protected company operation must consistently validate tenant context, access, and ownership. |
| Audit and support operations | Security-sensitive configuration changes and privileged operational-data access become traceable. |
| Future business modules | Modules inherit the established permission, tenant-isolation, menu, and action-authorization rules. |

## Measurable acceptance criteria

- [ ] A platform administrator can create a user, create a company-scoped role, assign permissions to that role, and assign that role to the user for one company.
- [ ] The same user can hold different active roles and effective permissions in two companies, and switching `X-Company-Id` changes the returned menu and available actions accordingly.
- [ ] A user assigned multiple active roles in one company receives the union of those roles' permissions only within that company.
- [ ] The system renders an authorized nested menu of at least three levels, hides unauthorized branches, and displays a route-less ancestor when it has an authorized descendant.
- [ ] A user may not navigate to or invoke an unauthorized route or action; direct backend calls are rejected even if frontend controls are manipulated.
- [ ] Every tested tenant-owned lookup and mutation validates the active-company context and cannot return, alter, or disclose a record belonging to another company.
- [ ] Removing a role, permission, or active company membership causes the next protected request to be denied when that removed access was required, without requiring a new login.
- [ ] `platform_admin` access to operational tenant data succeeds only through the explicit `platform.admin` permission and produces an audit record; no identity- or role-name-based bypass exists.
- [ ] User, role, permission, menu, and company-context changes produce protected immutable audit records containing actor, company where applicable, action, target, timestamp, and outcome.
- [ ] Authorization-context and authorized-menu retrieval meets the PDR target of under two seconds under normal operating conditions.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Cross-tenant exposure through inconsistent filtering or identifier manipulation | Treat company context and ownership validation as mandatory for every tenant-owned operation; test cross-tenant lookup and mutation denial. |
| Privilege escalation through role, permission, or platform-admin administration | Require explicit permissions, prevent hard-coded identity exceptions, and audit all configuration and privileged-data access. |
| Stale access after revocation | Revalidate or invalidate authorization state so the next protected request reflects the change; test active-session revocation. |
| Menu visibility is mistaken for security | Keep backend authorization authoritative and test direct endpoint invocation independently of the UI. |
| Recursive menus become unusable or contain invalid structures | Validate hierarchy integrity and ensure only authorized descendants determine parent visibility. |
| Broad `platform.admin` access is misused | Make all such access explicit, permission-based, and auditable; provide traceability for investigation. |

## Rollback

This is a greenfield vertical slice. Before release, rollback is cancellation of the change with no production data impact. After release, disable the affected administration capability and restore the prior validated release; preserve audit records and avoid deleting tenant or authorization history as part of rollback. Any later data migration and operational rollback procedure require a dedicated implementation design.

## Deferred decisions

- Exact password, session, token, refresh, and credential-recovery policies.
- Detailed lifecycle rules for deactivating versus deleting users, companies, roles, permissions, and menu entries.
- Role creation delegation: which non-platform administrators, if any, can create or modify company-scoped roles and within what boundaries.
- Precise audit retention, query access, before/after detail, export, and deletion policy.
- Exact performance load profile and authorization-state invalidation mechanism used to meet immediate revocation.
- The first production business-domain module and its record-state business rules.
- Accessibility, localization, visual design, and support-operating procedures beyond the necessary administration flow.

## Proposal question round

The approved answers establish the following proposal assumptions: the first slice is an administration-led proof of the complete authorization flow; `platform_admin` has audited operational-data access; revocations must apply immediately; tenant isolation and backend authority are non-negotiable; and route-less menu parents remain visible only to expose authorized descendants. These answers supersede earlier planning assumptions that named a different access model or deferred PostgreSQL and Prisma selection.
