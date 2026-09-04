CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE role_scope AS ENUM ('PLATFORM', 'SHARED', 'COMPANY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE TYPE record_status AS ENUM ('ACTIVE', 'INACTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, email text NOT NULL UNIQUE,
  password_hash text NOT NULL, status record_status NOT NULL DEFAULT 'ACTIVE',
  last_access_at timestamptz(6), created_at timestamptz(6) NOT NULL DEFAULT now(), updated_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, tax_id text UNIQUE,
  status record_status NOT NULL DEFAULT 'ACTIVE', created_at timestamptz(6) NOT NULL DEFAULT now(), updated_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE TABLE roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text, scope role_scope NOT NULL,
  company_id uuid REFERENCES companies(id), status record_status NOT NULL DEFAULT 'ACTIVE',
  created_at timestamptz(6) NOT NULL DEFAULT now(), updated_at timestamptz(6) NOT NULL DEFAULT now(),
  CONSTRAINT roles_scope_company_check CHECK (((scope = 'COMPANY' AND company_id IS NOT NULL) OR (scope <> 'COMPANY' AND company_id IS NULL))),
  CONSTRAINT roles_id_company_id_key UNIQUE (id, company_id)
);
CREATE INDEX roles_company_id_status_idx ON roles(company_id, status);
CREATE TABLE permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), code text NOT NULL UNIQUE, resource text NOT NULL, action text NOT NULL,
  description text, status record_status NOT NULL DEFAULT 'ACTIVE'
);
CREATE TABLE role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE, permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);
CREATE TABLE memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES users(id), company_id uuid NOT NULL REFERENCES companies(id),
  status record_status NOT NULL DEFAULT 'ACTIVE', starts_at timestamptz(6) NOT NULL DEFAULT now(), ends_at timestamptz(6),
  UNIQUE (user_id, company_id),
  UNIQUE (id, company_id)
);
CREATE INDEX memberships_company_id_id_idx ON memberships(company_id, id);
CREATE INDEX memberships_user_id_company_id_idx ON memberships(user_id, company_id);
CREATE TABLE membership_roles (
  membership_id uuid NOT NULL, role_id uuid NOT NULL, company_id uuid NOT NULL REFERENCES companies(id),
  PRIMARY KEY (membership_id, role_id),
  FOREIGN KEY (membership_id, company_id) REFERENCES memberships(id, company_id) ON DELETE CASCADE,
  FOREIGN KEY (role_id, company_id) REFERENCES roles(id, company_id) ON DELETE CASCADE
);
CREATE INDEX membership_roles_company_id_membership_id_idx ON membership_roles(company_id, membership_id);

CREATE TABLE menu_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, sort_order integer NOT NULL DEFAULT 0,
  status record_status NOT NULL DEFAULT 'ACTIVE'
);
CREATE TABLE menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), module_id uuid NOT NULL REFERENCES menu_modules(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES menu_items(id) ON DELETE RESTRICT, name text NOT NULL, description text, route text,
  sort_order integer NOT NULL DEFAULT 0, status record_status NOT NULL DEFAULT 'ACTIVE'
);
CREATE INDEX menu_items_module_id_sort_order_idx ON menu_items(module_id, sort_order);
CREATE INDEX menu_items_parent_id_sort_order_idx ON menu_items(parent_id, sort_order);
CREATE TABLE menu_permissions (
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE, permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (menu_item_id, permission_id)
);
CREATE TABLE audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES users(id), company_id uuid REFERENCES companies(id),
  resource text NOT NULL, action text NOT NULL, record_id uuid, result text NOT NULL, detail jsonb, ip text, user_agent text,
  created_at timestamptz(6) NOT NULL DEFAULT now()
);
CREATE INDEX audit_events_company_id_created_at_idx ON audit_events(company_id, created_at);
CREATE INDEX audit_events_user_id_created_at_idx ON audit_events(user_id, created_at);

CREATE OR REPLACE FUNCTION reject_menu_cycle() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE ancestor uuid;
BEGIN
  IF NEW.parent_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.parent_id = NEW.id THEN RAISE EXCEPTION 'menu item cannot be its own parent' USING ERRCODE = '23514'; END IF;
  WITH RECURSIVE ancestors(id) AS (
    SELECT parent_id FROM menu_items WHERE id = NEW.parent_id
    UNION ALL SELECT mi.parent_id FROM menu_items mi JOIN ancestors a ON mi.id = a.id WHERE a.id IS NOT NULL
  ) SELECT id INTO ancestor FROM ancestors WHERE id = NEW.id LIMIT 1;
  IF ancestor IS NOT NULL THEN RAISE EXCEPTION 'menu cycle detected' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER menu_items_no_cycle BEFORE INSERT OR UPDATE OF parent_id ON menu_items FOR EACH ROW EXECUTE FUNCTION reject_menu_cycle();

CREATE OR REPLACE FUNCTION validate_membership_role() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE membership_company uuid; role_scope_value role_scope; role_company uuid;
BEGIN
  SELECT company_id INTO membership_company FROM memberships WHERE id = NEW.membership_id;
  SELECT scope, company_id INTO role_scope_value, role_company FROM roles WHERE id = NEW.role_id;
  IF membership_company IS NULL OR membership_company <> NEW.company_id THEN RAISE EXCEPTION 'membership company mismatch' USING ERRCODE = '23514'; END IF;
  IF role_scope_value = 'PLATFORM' THEN RAISE EXCEPTION 'platform roles cannot be assigned to memberships' USING ERRCODE = '23514'; END IF;
  IF role_scope_value = 'COMPANY' AND role_company <> NEW.company_id THEN RAISE EXCEPTION 'role company mismatch' USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER membership_roles_scope_check BEFORE INSERT OR UPDATE ON membership_roles FOR EACH ROW EXECUTE FUNCTION validate_membership_role();

DO $$ BEGIN
  CREATE ROLE sic_runtime NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  CREATE ROLE sic_migrator NOLOGIN;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
GRANT USAGE ON SCHEMA public TO sic_runtime;
GRANT SELECT, INSERT ON users, companies, roles, permissions, role_permissions, memberships, membership_roles, menu_modules, menu_items, menu_permissions, audit_events TO sic_runtime;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO sic_runtime;
REVOKE UPDATE, DELETE, TRUNCATE ON audit_events FROM PUBLIC, sic_runtime;
ALTER TABLE audit_events OWNER TO sic_migrator;
REVOKE ALL ON audit_events FROM sic_migrator;
GRANT SELECT, INSERT ON audit_events TO sic_runtime;
