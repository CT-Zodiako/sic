-- Company services catalog and assignments.
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS company_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  service_id uuid NOT NULL REFERENCES services(id),
  status record_status NOT NULL DEFAULT 'ACTIVE',
  assigned_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS company_services_company_id_service_id_key ON company_services(company_id, service_id);
CREATE INDEX IF NOT EXISTS company_services_company_id_status_idx ON company_services(company_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON services TO sic_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE ON company_services TO sic_runtime;
