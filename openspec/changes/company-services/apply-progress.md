# Apply Progress: Company Services

## Completed

- Backend: migration `20260831000000_company_services` applied to live DB; `services.service.ts` (catalog + assignments, fail-closed, transactional audit); routes wired in `app.ts` (`/v1/platform/services`, `/v1/platform/company-services`); `main.ts` runtime wiring with `PrismaServiceRepository`; authorization-context now returns enabled services per company.
- Resolver fix: platform grants are company-independent in `canPlatformAsync` (identity + active membership still required); `requirePlatformAdmin` only treats `X-Company-Id` header as tenant context (body `companyId` is a payload).
- Seed: catalog Acueducto/Energía/Gas; Empresa A → Acueducto + Energía; Empresa B → Gas. Re-run applied to live DB.
- Frontend: guided **5. Servicios** section (catalog with chips, create form, activate/deactivate with consequences, assignment by names, Qué hacés / Para qué sirve / Resultado); operations screen shows enabled services of the active company.

## Evidence

- Backend: 64/64 (includes 7 focused company-services integration tests).
- Frontend: 35/35 (includes services payload/section tests).
- Lint: clean. Build: OK.
- Browser: focused spec 1/1 with system Chrome; live verification: admin sees section 5 with catalog and assignments; tenant sees Acueducto+Energía in Empresa A and only Gas in Empresa B.

## Deviations

- Permission lifecycle state was once left INACTIVE by an interrupted browser run; restored via seed re-run. Browser cleanup is now best-effort.
- Per-service menus/permissions remain deferred to the next phase per approved scope.

## Phase 2: service-driven menus and service-scoped records (user-approved follow-up)

Decisions: menu shows one entry per enabled service leading to the same Operaciones screen; no new permission codes; records are separated by company + service.

- Migration `20260901000000_service_records`: `service_code` column + FK to services(code) + index; applied to live DB.
- Seed: Empresa A record → acueducto; Empresa B record → gas.
- Backend: `TenantContext.serviceCode`; `X-Service-Code` header; records list/find/create/update/delete filter by service when present (legacy behavior preserved when absent); service-not-enabled → 403 SERVICE_NOT_ENABLED with audit; authorization-context appends one menu entry per enabled service for users with `operational-demo.read`.
- Frontend: operations screen reads `?service=`, shows "Servicio activo" chip, warns when a service is not enabled, sends the header on every record call; navigation parses menu query strings into router path + queryParams.

## Evidence (phase 2)

- Backend: 74/74 (includes service scoping + 403 fail-closed tests).
- Frontend: 36/36 (includes X-Service-Code header test).
- Lint: clean. Build: OK. Browser spec: 1/1.
- Live browser verification: Empresa A menu shows Acueducto + Energía; Acueducto shows Registro de Empresa A; Energía shows empty state; Empresa B menu shows Gas; Gas shows Registro de Empresa B.
