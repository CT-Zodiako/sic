-- Shared roles have company_id NULL, so the composite role FK cannot match them.
-- The role link is enforced by role_id alone; company scope rules stay in the trigger and service layer.
ALTER TABLE membership_roles DROP CONSTRAINT IF EXISTS membership_roles_role_id_company_id_fkey;
ALTER TABLE membership_roles ADD CONSTRAINT membership_roles_role_id_fkey FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE;
