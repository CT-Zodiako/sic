import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const compose = ['compose', '-f', 'docker-compose.test.yml', 'exec', '-T', 'postgres-test', 'psql', '-q', '-U', 'sic_test', '-d', 'sic_test', '-At', '-v', 'ON_ERROR_STOP=1'];

function sql(statement: string): string {
  const result = spawnSync('docker', [...compose, '-c', statement], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || 'database command failed');
  return result.stdout.trim();
}

function rejects(statement: string): void {
  const result = spawnSync('docker', [...compose, '-c', statement], { encoding: 'utf8' });
  assert.notEqual(result.status, 0, `expected SQL to fail: ${statement}`);
}

test('schema maps identifiers to uuid and timestamps to timestamptz', () => {
  assert.equal(sql("SELECT data_type FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'id'"), 'uuid');
  assert.equal(sql("SELECT udt_name FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at'"), 'timestamptz');
});

test('membership and role-permission links are unique', () => {
  const user = sql("INSERT INTO users (name,email,password_hash) VALUES ('u','u@example.test','x') RETURNING id");
  const company = sql("INSERT INTO companies (name) VALUES ('Company A') RETURNING id");
  const role = sql(`INSERT INTO roles (name,scope,company_id) VALUES ('operator','COMPANY','${company}') RETURNING id`);
  const permission = sql("INSERT INTO permissions (code,resource,action) VALUES ('demo.read','demo','read') RETURNING id");
  sql(`INSERT INTO memberships (user_id,company_id) VALUES ('${user}','${company}')`);
  sql(`INSERT INTO role_permissions (role_id,permission_id) VALUES ('${role}','${permission}')`);
  rejects(`INSERT INTO role_permissions (role_id,permission_id) VALUES ('${role}','${permission}')`);
  sql(`INSERT INTO membership_roles (membership_id,role_id,company_id) VALUES ((SELECT id FROM memberships WHERE user_id='${user}'),'${role}','${company}')`);
  rejects(`INSERT INTO membership_roles (membership_id,role_id,company_id) VALUES ((SELECT id FROM memberships WHERE user_id='${user}'),'${role}','${company}')`);
});

test('role scope and assignment triggers reject invalid tenant associations', () => {
  const companyA = sql("INSERT INTO companies (name) VALUES ('Company B') RETURNING id");
  const companyB = sql("INSERT INTO companies (name) VALUES ('Company C') RETURNING id");
  rejects(`INSERT INTO roles (name,scope) VALUES ('invalid','COMPANY')`);
  rejects(`INSERT INTO roles (name,scope,company_id) VALUES ('invalid','PLATFORM','${companyA}')`);
  const user = sql("INSERT INTO users (name,email,password_hash) VALUES ('v','v@example.test','x') RETURNING id");
  const membership = sql(`INSERT INTO memberships (user_id,company_id) VALUES ('${user}','${companyA}') RETURNING id`);
  const platformRole = sql("INSERT INTO roles (name,scope) VALUES ('platform admin','PLATFORM') RETURNING id");
  rejects(`INSERT INTO membership_roles (membership_id,role_id,company_id) VALUES ('${membership}','${platformRole}','${companyA}')`);
  sql(`INSERT INTO platform_role_assignments (user_id,role_id) VALUES ('${user}','${platformRole}')`);
  rejects(`UPDATE roles SET scope='SHARED' WHERE id='${platformRole}'`);
  const companyRole = sql(`INSERT INTO roles (name,scope,company_id) VALUES ('other tenant','COMPANY','${companyB}') RETURNING id`);
  rejects(`INSERT INTO platform_role_assignments (user_id,role_id) VALUES ('${user}','${companyRole}')`);
  rejects(`INSERT INTO membership_roles (membership_id,role_id,company_id) VALUES ('${membership}','${companyRole}','${companyA}')`);
});

test('tenant indexes and menu cycle protection are present', () => {
  assert.equal(sql("SELECT count(*) FROM pg_indexes WHERE indexname IN ('memberships_company_id_id_idx','memberships_user_id_company_id_idx','roles_company_id_status_idx')"), '3');
  assert.equal(sql("SELECT count(*) FROM pg_class WHERE relrowsecurity"), '0');
  const moduleId = sql("INSERT INTO menu_modules (name) VALUES ('Main') RETURNING id");
  const first = sql(`INSERT INTO menu_items (module_id,name) VALUES ('${moduleId}','First') RETURNING id`);
  const second = sql(`INSERT INTO menu_items (module_id,parent_id,name) VALUES ('${moduleId}','${first}','Second') RETURNING id`);
  rejects(`UPDATE menu_items SET parent_id='${second}' WHERE id='${first}'`);
});

test('runtime database role cannot update or delete audit events', () => {
  const audit = sql("INSERT INTO audit_events (resource,action,result) VALUES ('test','insert','success') RETURNING id");
  rejects(`SET ROLE sic_runtime; UPDATE audit_events SET result='tampered' WHERE id='${audit}'`);
  rejects(`SET ROLE sic_runtime; DELETE FROM audit_events WHERE id='${audit}'`);
  assert.equal(sql(`SELECT result FROM audit_events WHERE id='${audit}'`), 'success');
});
