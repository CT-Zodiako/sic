# sic — Project Context

## Outcome
Build a greenfield, single-root multi-tenant business system with an Angular frontend and NestJS backend. The canonical requirements source is [PDR_Sistema_Multiempresa_Permisos.md](../PDR_Sistema_Multiempresa_Permisos.md).

## Confirmed SDD setup

| Topic | Decision |
| --- | --- |
| Execution mode | Interactive |
| Artifact store | Both; OpenSpec is canonical |
| Delivery strategy | Auto-chain |
| Review budget | 400 changed lines |
| Testing policy | Strict TDD |

No application source, package manifest, test runner command, or Git repository is currently present. This initialization creates context only; it does not create a proposal, specification, design, task list, or implementation.

## Architectural constraints from the PDR

- Tenant authorization is evaluated as user + active company + role + permission + business rule.
- Company-specific role assignments yield the union of active roles' permissions.
- The frontend sends the active-company context using `X-Company-Id`; the backend validates membership, route/header consistency, resource ownership, permissions, and business rules on every protected operation.
- All tenant-owned records and queries must enforce company isolation; cross-tenant resource lookup must not disclose existence.
- Menu visibility derives from effective permissions: a route-less parent appears when an authorized descendant exists, while a parent route also requires its own minimum permission.
- The frontend improves navigation and action visibility, but the backend remains the security authority.
- Access tokens are short-lived (initial target: 10–15 minutes), refresh tokens are revocable, and authorization changes must invalidate or version cached permissions.
- `platform_admin` is an explicit, auditable `platform.admin` permission, never a hard-coded user exception.
- Critical security and business actions require immutable, permission-protected audit records.

## Planned stack and testing

| Area | Current decision |
| --- | --- |
| Frontend | Angular |
| Backend | NestJS |
| ORM | Undecided: Prisma or TypeORM |
| Database | Relational database; vendor undecided |
| Backend tests | Jest with `@nestjs/testing` after scaffolding |
| Frontend tests | Angular TestBed with Jest or Vitest; runner undecided until scaffolding |
| Test commands | Not available until the applications are scaffolded |

Strict TDD applies to future apply and verification work: write or update a focused failing test first, implement the smallest change that passes it, then run the relevant test suite. Broader integration, tenant-isolation, authorization, and audit tests must accompany affected behavior.

## Assumptions

1. `backend/` and `frontend/` will be created as plain folders in one root repository when scaffolding begins.
2. The PDR is the current product source of truth; its proposed schema and API contracts are inputs for later design, not implementation decisions yet.
3. The initial release prioritizes the identity, tenant-context, authorization, menu, audit, and security foundations before domain modules.

## Open questions before proposal

1. Which ORM (Prisma or TypeORM) and relational database vendor will be used?
2. Which first business modules, beyond the authorization foundation, are in scope?
3. What is the exact permission-cache invalidation and revocation latency target?
4. What tenant-data scope, if any, does `platform.admin` have outside testing and platform administration?
5. Can companies create custom roles, and what limits govern shared, company, and platform roles?
6. Which actions require before/after audit detail, and what retention and deletion policies apply?
7. Which frontend test runner (Jest or Vitest) should the Angular scaffold standardize on?

## Reinitialization notes

An older Engram context described Prisma and PostgreSQL as planned. That information is superseded where it conflicts with the current confirmed preflight: ORM and database vendor remain undecided. The previous executor-model launch did not start, so this is the first effective initialization.
