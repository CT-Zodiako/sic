-- Records are scoped by company and service.
ALTER TABLE operational_demo_records ADD COLUMN IF NOT EXISTS service_code text NOT NULL DEFAULT 'acueducto';
ALTER TABLE operational_demo_records ADD CONSTRAINT operational_demo_records_service_code_fkey FOREIGN KEY (service_code) REFERENCES services(code);
CREATE INDEX IF NOT EXISTS operational_demo_records_company_id_service_code_idx ON operational_demo_records(company_id, service_code);
