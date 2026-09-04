-- PR8 forward configuration: explicit menu permission composition.
DO $$ BEGIN
  CREATE TYPE permission_mode AS ENUM ('ANY', 'ALL');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS permission_mode permission_mode NOT NULL DEFAULT 'ANY';
CREATE TABLE IF NOT EXISTS platform_role_assignments (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, role_id)
);
GRANT SELECT, INSERT, DELETE ON platform_role_assignments TO sic_runtime;

CREATE OR REPLACE FUNCTION enforce_platform_role_assignment_scope()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM roles WHERE id = NEW.role_id AND scope = 'PLATFORM'
  ) THEN
    RAISE EXCEPTION 'platform_role_assignments requires a PLATFORM role';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS platform_role_assignment_scope ON platform_role_assignments;
CREATE TRIGGER platform_role_assignment_scope
  BEFORE INSERT OR UPDATE OF role_id ON platform_role_assignments
  FOR EACH ROW EXECUTE FUNCTION enforce_platform_role_assignment_scope();

CREATE OR REPLACE FUNCTION prevent_scoped_role_assignment_downgrade()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.scope <> 'PLATFORM' AND EXISTS (
    SELECT 1 FROM platform_role_assignments WHERE role_id = NEW.id
  ) THEN
    RAISE EXCEPTION 'a role with platform assignments must remain PLATFORM';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS role_assignment_scope ON roles;
CREATE TRIGGER role_assignment_scope
  BEFORE UPDATE OF scope ON roles
  FOR EACH ROW EXECUTE FUNCTION prevent_scoped_role_assignment_downgrade();
