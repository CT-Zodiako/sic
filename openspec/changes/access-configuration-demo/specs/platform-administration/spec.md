# Delta for Platform Administration

## ADDED Requirements

### Requirement: Permission Catalog and Authorization Link Lifecycle

The system MUST provide an authorized platform administrator with a permission catalog containing unique permission codes, resource/action labels, descriptions, and active or inactive state. The initial catalog MUST include `platform.admin` and `operational-demo.read`, `operational-demo.create`, `operational-demo.update`, `operational-demo.delete`, and `operational-demo.action`. The system MUST support deactivation of permissions and authorization links without deleting historical evidence. Inactive permissions, role-permission links, role assignments, menu-permission links, memberships, roles, companies, menu entries, and action access links MUST grant no access on the next protected request.

#### Scenario: Initial operational permission coverage is available

- GIVEN the permission catalog is initialized
- WHEN a platform administrator inspects the catalog
- THEN all five `operational-demo.*` permissions and the explicit `platform.admin` permission are present with unique codes and lifecycle state

#### Scenario: Inactive permission fails closed

- GIVEN a user previously received `operational-demo.update` through an active company role
- WHEN that permission is deactivated
- THEN the user's next update request is denied and the update makes no state change

#### Scenario: Duplicate active authorization links are prevented

- GIVEN a role or menu entry already has an active link to a permission
- WHEN an administrator attempts to create the same active link again
- THEN the operation is rejected as a validation or conflict error and only one effective link remains

### Requirement: Company-Scoped Role and Membership Assignment Integrity

The system MUST allow a membership to have one or more active company-scoped role assignments, MUST prevent duplicate active assignment of the same role to the same membership, and MUST reject assignments whose role, membership, or company is inactive or belongs to a different company. Direct user-to-permission and user-to-menu grants MUST NOT be available. Removing or deactivating an assignment MUST immediately remove its contribution to effective permissions.

#### Scenario: Multiple active roles provide CRUD and action coverage

- GIVEN a user has an active membership in Company A with one role granting read/create and another granting update/delete/action
- WHEN authorization is evaluated in Company A
- THEN the effective permissions are the union of those active role permissions and the user can perform exactly the granted demo operations

#### Scenario: Assignment from another company is rejected

- GIVEN a membership belongs to Company A and a role belongs to Company B
- WHEN an administrator attempts to assign that role to the membership
- THEN the operation is rejected and no cross-company grant is created

#### Scenario: Removing one role preserves only remaining grants

- GIVEN a user has two active roles in Company A and one is deactivated
- WHEN the user's next authorization context is evaluated
- THEN permissions supplied only by the deactivated role are absent while permissions supplied by the remaining role persist

### Requirement: Operational Demo Permission-Proof Workflow

The system MUST provide a company-scoped operational-demo workflow with independently protected read, create, update, delete, and action operations. The demonstration MUST support at least listing and viewing records, creating a record, changing a record, deleting a record, and invoking a named action. Each operation MUST be authorized by its corresponding effective permission and MUST enforce tenant ownership and applicable business rules. A user with read permission alone MUST be able to read but MUST NOT be able to mutate or invoke the action.

#### Scenario: Read-only user cannot mutate directly

- GIVEN the active Company A context grants `operational-demo.read` but not create, update, delete, or action
- WHEN the user reads the demo and directly calls each unavailable operation
- THEN the read succeeds, every unavailable call is rejected by the backend, and no record changes

#### Scenario: Authorized CRUD and action operations succeed

- GIVEN the active company grants each corresponding operational-demo permission
- WHEN the user performs valid create, update, delete, and action requests on a record owned by that company
- THEN each permitted operation succeeds and the resulting record state is visible in that company

#### Scenario: Cross-company demo record is not disclosed

- GIVEN a record belongs to Company B and the active context is Company A
- WHEN the user attempts to read, update, delete, or act on the Company B record identifier
- THEN the backend rejects the request without returning the record or changing its state

### Requirement: Two-Company Demonstration Fixture and Context Switching

The demonstration MUST provide or make it straightforward to establish Company A and Company B, an active demonstration user, distinct company memberships, and distinct active role-derived permissions. Switching the active company MUST refresh the validated company context, effective permissions, authorized menu, and available actions. No role, record, menu entry, or permission from one company MAY leak into the other company's context.

#### Scenario: Same user sees distinct Company A and Company B capabilities

- GIVEN the demonstration user has read/create access in Company A and read/update/action access in Company B
- WHEN the user switches between the two active companies
- THEN the displayed menus and action controls change to the matching permission set and each request carries the selected company context

#### Scenario: Revoked or unavailable company cannot remain selectable

- GIVEN the demonstration user's Company B membership or company is deactivated
- WHEN the user refreshes or requests selectable companies
- THEN Company B is absent from selectable contexts and a protected Company B request is denied

### Requirement: Platform Configuration Experience

The Angular platform-configuration module MUST be available only to an authenticated user whose current authorization includes explicit `platform.admin`. It MUST present accessible Material-based views for users, companies, memberships, roles, permission assignments, menu entries, and audit evidence as applicable to the release. Forms MUST validate required and uniquely constrained fields before submission and MUST provide loading, empty, failure, success, and access-denied feedback. Unavailable menus and security-sensitive action controls MUST be hidden; the absence of a control MUST NOT replace backend authorization.

#### Scenario: Non-administrator cannot access configuration

- GIVEN an authenticated user lacks `platform.admin`, including a user with a role merely named `platform_admin`
- WHEN the user navigates to or directly requests the configuration module
- THEN the route and configuration endpoints are denied, no configuration data is returned, and the denial is communicated safely

#### Scenario: Configuration mutation refreshes derived access

- GIVEN a platform administrator changes a membership, role, permission link, or menu link
- WHEN the mutation succeeds
- THEN the UI reports success and refreshes the affected lists and authorization context without requiring logout or client restart

#### Scenario: Configuration errors preserve safety and usability

- GIVEN a configuration request is loading, empty, invalid, unavailable, or denied
- WHEN the corresponding state is rendered
- THEN the module exposes a clear accessible status and does not display stale data as current authority

## MODIFIED Requirements

### Requirement: Permission-Driven Menu, Routes, and Actions

The system MUST support active, ordered menu entries at arbitrary nesting depth, with optional routes and permission requirements. For the active company, the system MUST return and present only authorized menu branches, routes, and screen actions. Unavailable menu entries and security-sensitive action controls MUST be hidden rather than presented as executable disabled affordances. A route-less parent MUST be visible when it has at least one authorized descendant. A parent with its own route MUST require its own minimum permission to navigate, independently of descendant visibility. Multiple permissions linked to a menu entry MUST use OR logic unless that entry explicitly declares AND logic. An inactive menu entry or inactive permission link MUST be absent from the authorized menu. An unauthorized route MUST be blocked in normal client navigation, and its protected backend operation MUST remain denied.
(Previously: The canonical requirement defined permission-filtered nested menus and routes but did not explicitly require hidden unavailable action controls or inactive menu-link filtering.)

#### Scenario: Authorized three-level navigation is presented

- GIVEN an active company context grants access to a third-level menu entry
- WHEN the authorized menu is requested
- THEN the system presents the authorized entry and its route-less ancestors in configured order

#### Scenario: Unauthorized branches and actions are hidden

- GIVEN a menu branch or demo action has no effective authorization
- WHEN the active-company navigation and screen are rendered
- THEN the branch and action control are absent, while direct backend invocation remains denied

#### Scenario: Parent route remains independently protected

- GIVEN a parent menu entry has a route but the user lacks its minimum permission while the user can access a descendant
- WHEN the authorized menu is requested or the parent route is attempted
- THEN the parent remains available only as a route-less ancestor for the descendant and its own route is not navigable

#### Scenario: Menu permission composition is explicit

- GIVEN one menu entry links two permissions without an explicit AND declaration and another explicitly requires AND
- WHEN the user has only one of the linked permissions
- THEN the first entry is authorized and the explicitly AND entry is not

### Requirement: Immediate Revocation

The system MUST re-evaluate or invalidate authorization state so removal or deactivation of a permission, role permission, role assignment, membership, role, company, relevant menu authorization, action access link, or `platform.admin` permission takes effect on the next protected request in an already active session. A new login, token refresh, or client restart MUST NOT be required for the revocation to be enforced. Derived company lists, menus, and action controls SHOULD refresh after a successful configuration mutation.
(Previously: The canonical requirement covered revocation of role assignments, role permissions, memberships, menu authorization, and `platform.admin`, but did not enumerate all lifecycle-controlled entities or require derived UI refresh.)

#### Scenario: Active-session role revocation is enforced

- GIVEN a user has an active session and a role that authorizes a protected Company A action
- WHEN an authorized administrator removes that role assignment
- THEN the user's next protected Company A request for that action is denied without a new login

#### Scenario: Active-session permission revocation is enforced

- GIVEN a user has an active session and receives a required permission through a Company A role
- WHEN an authorized administrator removes that permission from the role
- THEN the user's next protected Company A request requiring that permission is denied without a new login

#### Scenario: Membership, company, or platform authority revocation is enforced

- GIVEN a user has an active session and access through an active membership, company, or `platform.admin` permission
- WHEN the relevant entity is deactivated
- THEN the next protected request is denied or narrowed to the remaining valid context, and no stale authorization is accepted

### Requirement: Immutable Security Audit History

The system MUST create immutable audit events for login and session-relevant events, company-context selections or changes, user and company administration, membership and role assignment changes, role-permission changes, menu and action-link changes, enable/disable events, authorization-sensitive access decisions, and platform-administrator access to operational tenant data. Each event MUST include the actor, applicable company where known, action, target or resource, timestamp, and outcome. Successful configuration mutations MUST include safe before/after values or a documented redacted summary; denied requests MUST include a safe denial reason. Audit history MUST be protected from modification by ordinary functional flows and its access MUST require explicit authorization. A detailed retention period is a documented follow-up decision and MUST NOT weaken immutability or availability for acceptance evidence.
(Previously: The canonical requirement required immutable audit events with actor, company, action, target, timestamp, and outcome, but did not require safe before/after mutation detail, denial reasons, or explicit retention follow-up.)

#### Scenario: Authorization change is traceable

- GIVEN an authorized administrator changes a role assignment, role permission, menu configuration, membership, or lifecycle state
- WHEN the change succeeds or is denied
- THEN an immutable audit event records the actor, applicable company, action, target, timestamp, outcome, and safe before/after or denial detail

#### Scenario: Protected denial is traceable without disclosure

- GIVEN a user makes a denied configuration, demo, cross-company, or context request
- WHEN authorization rejects the request
- THEN an audit event records the actor, action, target or resource, company where safely known, outcome, and denial reason without exposing another company's data

#### Scenario: Audit records cannot be altered by ordinary administration

- GIVEN an existing audit event
- WHEN an ordinary functional administration flow attempts to modify or remove it
- THEN the system denies the attempt and preserves the original event
