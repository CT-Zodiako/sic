# Proposal: Company Services

**Status:** approved (user decisions confirmed in-session).

## Intent

Companies in the platform can have services assigned: **Acueducto**, **Energía**, **Gas**, or new services created by the platform administrator. Assigning a service to a company is the foundation for enabling a complete module for that company in a later phase.

## Confirmed decisions

1. **Service enables a complete module** — assignment is the gate; per-service menus/permissions come in a later phase. This change lays the foundation (service code → module concept).
2. **Catalog** — Acueducto, Energía, Gas seeded; `platform.admin` can create, activate and deactivate services freely with unique codes.
3. **First version scope** — assignment + visualization only.

## Scope

### In scope

- Service catalog: unique code, Spanish name, optional description, ACTIVE/INACTIVE lifecycle. Seeded: `acueducto`, `energia`, `gas`.
- Company-service assignment: a company can have multiple services; no duplicates; safe removal/deactivation; audit on every change.
- Backend: platform.admin-only mutations, fail-closed validation (company and service must be active), transactional audit following existing patterns.
- Spanish UI:
  - Admin panel new section **Servicios** (catalog + assignment, with Qué hacés / Para qué sirve / Resultado explanations, consistent with the guided panel).
  - Operations screen shows the services enabled for the active company.
  - Company selector context can surface enabled services.

### Non-goals

- Per-service menus, permissions, or module screens (later phase; design must not block it).
- Service contracts, tariffs, or billing.
- Company-admin self-management of services.

## Product rules

- Only `platform.admin` mutates the catalog or assignments.
- A company may hold many services; the same service may be assigned to many companies.
- Deactivating a service does not delete assignments; it prevents new assignments and hides the service from company visualization.
- Deactivating an assignment removes it from the company's enabled services on the next request.
- Every mutation writes an audit event (actor, company, action, result, before/after).

## Success criteria

- Admin sees **Acueducto, Energía, Gas** and can create a new service.
- Admin assigns services to Empresa A and Empresa B.
- Users of each company see only that company's enabled services.
- Deactivating a service or assignment removes it from visualization without deleting data.
- All changes appear in audit evidence.

## Tasks

1. [x] Backend: schema/migration for `services` and `company_services` (unique service code; unique company+service; status lifecycle).
2. [x] Backend: service + assignment endpoints (list, create, activate/deactivate, assign, unassign) with platform.admin guard and audit.
3. [x] Backend: seed catalog and sample assignments (Empresa A/B with distinct services).
4. [x] Backend: tests for duplicates, inactive references, audit, 403 for non-admin.
5. [x] Frontend: **Servicios** section in the guided admin panel (catalog list/create/toggle, assignment by names, explanations per action).
6. [x] Frontend: operations screen shows enabled services for the active company; update company context payload if needed.
7. [x] Verification: full backend/frontend suites, seed re-run, focused browser check, Spanish UI review.

## Deferred

- Service-driven modules: menus and permissions per service (next change; consume service codes as module keys).
