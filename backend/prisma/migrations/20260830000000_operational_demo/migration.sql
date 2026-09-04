-- PR9 tenant-scoped operational demonstration fixture.
CREATE TABLE IF NOT EXISTS operational_demo_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  label text NOT NULL,
  status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz(6) NOT NULL DEFAULT now(),
  updated_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS operational_demo_records_id_company_id_key ON operational_demo_records(id, company_id);
CREATE INDEX IF NOT EXISTS operational_demo_records_company_id_id_idx ON operational_demo_records(company_id, id);
CREATE INDEX IF NOT EXISTS operational_demo_records_company_id_status_idx ON operational_demo_records(company_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON operational_demo_records TO sic_runtime;
