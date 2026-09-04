-- Eligibility: which companies a shared role may be assigned in. Empty = all companies.
CREATE TABLE IF NOT EXISTS role_companies (
  role_id uuid NOT NULL REFERENCES roles(id),
  company_id uuid NOT NULL REFERENCES companies(id),
  created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS role_companies_role_id_company_id_key ON role_companies(role_id, company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON role_companies TO sic_runtime;
