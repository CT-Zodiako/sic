# Platform Administration Specification

## Purpose

Provide a secure, auditable platform-administration slice that establishes tenant users, companies, company-scoped authorization, and permission-driven navigation and actions without permitting cross-tenant access.

## Requirements

### Requirement: Explicit Platform Administration Authority

The system MUST grant platform-administration authority only when the authenticated user has the explicit `platform.admin` permission. The system MUST NOT infer that authority from an identity attribute, account name, email address, or role name. A user with `platform.admin` MUST be able to administer users, companies, company-scoped roles, role permissions, role assignments, and menu configuration. Any platform-administrator access to operational tenant data MUST be authorized by `platform.admin` and audited.

#### Scenario: Explicit permission authorizes platform administration

- GIVEN an authenticated user has the `platform.admin` permission
- WHEN the user performs a platform-administration operation
- THEN the system permits the operation and records its outcome in the audit history

#### Scenario: Role name alone does not authorize administration

- GIVEN an authenticated user has a role named `platform_admin` but lacks `platform.admin`
- WHEN the user attempts a platform-administration operation
- THEN the system denies the operation and records the authorization-sensitive outcome

#### Scenario: Privileged operational-data access is audited

- GIVEN an authenticated user has `platform.admin`
- WHEN the user accesses operational tenant data
- THEN the system permits the access only through that permission and records an audit event identifying the actor, tenant data context, target, timestamp, and outcome

### Requirement: Platform Administration of Users, Companies, and Memberships

The system MUST allow an authorized platform administrator to create and manage users and companies and to establish, activate, and revoke user-company memberships. The system MUST expose only active memberships as companies available to a user. A user without an active membership MUST NOT select or use that company context.

#### Scenario: Administrator establishes a tenant user

- GIVEN a platform administrator and a company
- WHEN the administrator creates a user, establishes an active membership, and assigns a company-scoped role
- THEN the user can use that company only according to the permissions granted by active roles in that company

#### Scenario: User without active company access is denied

- GIVEN an authenticated user has no active membership in Company A
- WHEN the user attempts to select Company A or sends a company-scoped request for Company A
- THEN the system denies access without returning Company A tenant data

### Requirement: Company-Scoped Roles and Effective Permissions

The system MUST allow an authorized platform administrator to create and manage reusable company-scoped roles, assign and remove permissions on those roles, and assign and remove those roles for active user-company memberships. A role and its assignment MUST grant permissions only in the company for which they are valid. The effective permissions for a user in an active company MUST equal the union of permissions from that user's active roles in that company and MUST NOT include permissions from another company.

#### Scenario: Multiple roles produce a same-company union

- GIVEN a user has two active roles in Company A with distinct permissions
- WHEN the system evaluates the user's authorization in Company A
- THEN the effective permissions contain the union of both roles' permissions

#### Scenario: Same user has different permissions by company

- GIVEN a user has active roles with different permissions in Company A and Company B
- WHEN the user changes from Company A to Company B
- THEN the system returns and presents permissions, navigation, and actions applicable only to Company B

#### Scenario: Cross-company role assignment grants nothing

- GIVEN a user has a role assigned only in Company A
- WHEN the user requests a protected Company B operation
- THEN the system does not use the Company A role to authorize the operation

### Requirement: Validated Active Company Context

The system MUST require `X-Company-Id` for every protected company-scoped operation. The system MUST validate that the header identifies an active company membership for the authenticated user. When an operation identifies a company in another request value, the system MUST require it to match `X-Company-Id`. Missing, malformed, inconsistent, inactive, or unverifiable company context MUST deny access safely.

#### Scenario: Valid company context is accepted

- GIVEN an authenticated user has an active membership in Company A
- WHEN the user sends a protected Company A request with `X-Company-Id` set to Company A
- THEN the system evaluates authorization in Company A

#### Scenario: Header and requested company disagree

- GIVEN an authenticated user has active memberships in Company A and Company B
- WHEN the user sends a Company A operation with `X-Company-Id` set to Company B
- THEN the system denies the request and does not process it as either company

#### Scenario: Missing context fails closed

- GIVEN an authenticated user sends a protected company-scoped request without a verifiable `X-Company-Id`
- WHEN authorization is evaluated
- THEN the system denies the request without granting a default company context

### Requirement: Tenant Isolation and Backend Authorization

The backend MUST be the decisive authority for every protected operation. Before returning or changing tenant-owned data, it MUST validate authentication, active company context, membership, effective permission, and tenant ownership of the target where applicable. A client-side route guard, menu state, or manipulated action control MUST NOT authorize an operation. A cross-tenant lookup or mutation MUST NOT return, alter, or disclose the existence of a target owned by another company.

#### Scenario: Direct unauthorized action is rejected

- GIVEN a user can view an administration screen but lacks the permission for a protected action
- WHEN the user invokes that action directly while bypassing the client controls
- THEN the backend denies the action and makes no change

#### Scenario: Cross-tenant identifier does not disclose a target

- GIVEN a target belongs to Company B and the request is authorized only for Company A
- WHEN the user requests, updates, or deletes the target using its identifier
- THEN the system neither returns nor changes the target and responds as not visible in Company A

#### Scenario: Applicable business rule remains required

- GIVEN a user has the permission for a protected action
- WHEN an applicable business rule for the target is not satisfied
- THEN the backend denies the action without treating permission as sufficient by itself

### Requirement: Permission-Driven Menu, Routes, and Actions

The system MUST support active, ordered menu entries at arbitrary nesting depth, with optional routes and permission requirements. For the active company, the system MUST return and present only authorized menu branches, routes, and screen actions. A route-less parent MUST be visible when it has at least one authorized descendant. A parent with its own route MUST require its own minimum permission to be navigable, independently of descendant visibility. Multiple permissions linked to a menu entry MUST use OR logic unless that entry explicitly declares AND logic. An unauthorized route MUST be blocked in normal client navigation, and its protected backend operation MUST remain denied.

#### Scenario: Authorized three-level navigation is presented

- GIVEN an active company context grants access to a third-level menu entry
- WHEN the authorized menu is requested
- THEN the system presents the authorized entry and its route-less ancestors in configured order

#### Scenario: Unauthorized branches are absent

- GIVEN a menu branch has no authorized descendant and its own route permission is not granted
- WHEN the authorized menu is requested
- THEN the system does not present that branch

#### Scenario: Parent route remains independently protected

- GIVEN a parent menu entry has a route but the user lacks its minimum permission while the user can access a descendant
- WHEN the authorized menu is requested or the parent route is attempted
- THEN the parent remains available only as a route-less ancestor for the descendant and its own route is not navigable

#### Scenario: Menu permission composition is explicit

- GIVEN one menu entry links two permissions without an explicit AND declaration and another explicitly requires AND
- WHEN the user has only one of the linked permissions
- THEN the first entry is authorized and the explicitly AND entry is not

### Requirement: Immediate Revocation

The system MUST re-evaluate or invalidate authorization state so removal or deactivation of a role assignment, role permission, user-company membership, relevant menu authorization, or `platform.admin` permission takes effect on the next protected request in an already active session. A new login, token refresh, or client restart MUST NOT be required for the revocation to be enforced.

#### Scenario: Active-session role revocation is enforced

- GIVEN a user has an active session and a role that authorizes a protected Company A action
- WHEN an authorized administrator removes that role assignment
- THEN the user's next protected Company A request for that action is denied without a new login

#### Scenario: Active-session permission revocation is enforced

- GIVEN a user has an active session and receives a required permission through a Company A role
- WHEN an authorized administrator removes that permission from the role
- THEN the user's next protected Company A request requiring that permission is denied without a new login

#### Scenario: Membership revocation invalidates company context

- GIVEN a user has an active session and active membership in Company A
- WHEN an authorized administrator deactivates that membership
- THEN the user's next Company A request using `X-Company-Id` is denied and Company A is no longer offered as an active company

### Requirement: Immutable Security Audit History

The system MUST create immutable audit events for login and session-relevant events, company-context selections or changes, user and company administration, membership and role assignment changes, role-permission changes, menu changes, authorization-sensitive access decisions, and platform-administrator access to operational tenant data. Each event MUST include the actor, applicable company, action, target or resource, timestamp, and outcome. Audit history MUST be protected from modification by ordinary functional flows and its access MUST require explicit authorization.

#### Scenario: Authorization change is traceable

- GIVEN an authorized administrator changes a role assignment, role permission, or menu configuration
- WHEN the change succeeds or is denied
- THEN an immutable audit event records the actor, applicable company, action, target, timestamp, and outcome

#### Scenario: Audit records cannot be altered by ordinary administration

- GIVEN an existing audit event
- WHEN an ordinary functional administration flow attempts to modify or remove it
- THEN the system denies the attempt and preserves the original event

### Requirement: Authorization Context and Menu Responsiveness

The system SHOULD return a user's validated active-company authorization context and authorized menu in under two seconds under normal operating conditions. If the system cannot verify the necessary authorization context, it MUST deny access rather than return permissions or menu entries based on stale or incomplete information.

#### Scenario: Context retrieval meets the target

- GIVEN normal operating conditions and a user with an active company membership
- WHEN the user requests the validated authorization context and authorized menu
- THEN the response is completed in under two seconds and contains only the active-company authorization result

#### Scenario: Context verification failure denies access

- GIVEN the system cannot verify the user's company context or effective permissions
- WHEN the user requests protected context, menu, route, or action information
- THEN the system denies the protected access and does not grant permissions by default
