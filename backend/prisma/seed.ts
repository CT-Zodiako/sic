import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { scryptSync } from 'node:crypto';
const ids = {
  admin: '00000000-0000-4000-8000-000000000001',
  user: '00000000-0000-4000-8000-000000000002',
  companyA: '00000000-0000-4000-8000-000000000011',
  companyB: '00000000-0000-4000-8000-000000000012',
  platformRole: '00000000-0000-4000-8000-000000000021',
  roleA: '00000000-0000-4000-8000-000000000022',
  roleB: '00000000-0000-4000-8000-000000000023',
  membershipA: '00000000-0000-4000-8000-000000000031',
  membershipB: '00000000-0000-4000-8000-000000000032',
  adminMembershipA: '00000000-0000-4000-8000-000000000033',
  adminMembershipB: '00000000-0000-4000-8000-000000000034',
  module: '00000000-0000-4000-8000-000000000041',
  menu: '00000000-0000-4000-8000-000000000042',
  adminMenu: '00000000-0000-4000-8000-000000000043',
  adminMenuPermisos: '00000000-0000-4000-8000-000000000044',
  adminMenuConfig: '00000000-0000-4000-8000-000000000050',
  adminMenuRoles: '00000000-0000-4000-8000-000000000049',
  adminMenuUsuarios: '00000000-0000-4000-8000-000000000045',
  adminMenuEmpresas: '00000000-0000-4000-8000-000000000046',
  adminMenuMenus: '00000000-0000-4000-8000-000000000047',
  adminMenuServicios: '00000000-0000-4000-8000-000000000048',
  serviceWater: '00000000-0000-4000-8000-000000000071',
  serviceEnergy: '00000000-0000-4000-8000-000000000072',
  serviceGas: '00000000-0000-4000-8000-000000000073',
};

const passwordHash = `scrypt$seed-salt$${scryptSync('Cambiar1234!', 'seed-salt', 32).toString('base64url')}`;
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`;
const dryRun = process.argv.includes('--dry-run');

if (process.env.NODE_ENV === 'production') throw new Error('SEED_DISABLED_IN_PRODUCTION');
if (!dryRun && process.env.SEED_DATABASE !== 'true') throw new Error('Set SEED_DATABASE=true for development/test seed execution.');

if (dryRun) {
  console.log('Seed dry-run: development/test fixtures only; no database writes.');
} else {
  let disconnect: (() => Promise<unknown>) | undefined;
  const run = async () => {
    const { PrismaClient } = await import('@prisma/client');
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
    const prisma = new PrismaClient({ adapter });
    disconnect = () => prisma.$disconnect();
    const exec = (sql: string) => prisma.$executeRawUnsafe(sql);
    await exec(`INSERT INTO companies (id, name, status) VALUES (${quote(ids.companyA)}, 'Empresa A', 'ACTIVE'), (${quote(ids.companyB)}, 'Empresa B', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status`);
    await exec(`INSERT INTO users (id, name, email, password_hash, status) VALUES (${quote(ids.admin)}, 'Administrador de la plataforma', 'admin@sic.test', ${quote(passwordHash)}, 'ACTIVE'), (${quote(ids.user)}, 'Usuario de operaciones', 'operaciones@sic.test', ${quote(passwordHash)}, 'ACTIVE') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, status = EXCLUDED.status`);
    await exec(`INSERT INTO permissions (id, code, resource, action, status) VALUES ('00000000-0000-4000-8000-000000000051', 'platform.admin', 'platform', 'admin', 'ACTIVE'), ('00000000-0000-4000-8000-000000000052', 'operational-demo.read', 'operational-demo', 'read', 'ACTIVE'), ('00000000-0000-4000-8000-000000000053', 'operational-demo.action', 'operational-demo', 'action', 'ACTIVE'), ('00000000-0000-4000-8000-000000000054', 'operational-demo.create', 'operational-demo', 'create', 'ACTIVE'), ('00000000-0000-4000-8000-000000000055', 'operational-demo.update', 'operational-demo', 'update', 'ACTIVE'), ('00000000-0000-4000-8000-000000000056', 'operational-demo.delete', 'operational-demo', 'delete', 'ACTIVE') ON CONFLICT (code) DO UPDATE SET status = 'ACTIVE'`);
    await exec(`INSERT INTO roles (id, name, scope, company_id, status) VALUES (${quote(ids.platformRole)}, 'Administrador de la plataforma', 'PLATFORM', NULL, 'ACTIVE'), (${quote(ids.roleA)}, 'Operador de Empresa A', 'COMPANY', ${quote(ids.companyA)}, 'ACTIVE'), (${quote(ids.roleB)}, 'Operador de Empresa B', 'COMPANY', ${quote(ids.companyB)}, 'ACTIVE') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status`);
    await exec(`INSERT INTO platform_role_assignments (user_id, role_id) VALUES (${quote(ids.admin)}, ${quote(ids.platformRole)}) ON CONFLICT DO NOTHING`);
    await exec(`INSERT INTO memberships (id, user_id, company_id, status) VALUES (${quote(ids.membershipA)}, ${quote(ids.user)}, ${quote(ids.companyA)}, 'ACTIVE'), (${quote(ids.membershipB)}, ${quote(ids.user)}, ${quote(ids.companyB)}, 'ACTIVE'), (${quote(ids.adminMembershipA)}, ${quote(ids.admin)}, ${quote(ids.companyA)}, 'ACTIVE'), (${quote(ids.adminMembershipB)}, ${quote(ids.admin)}, ${quote(ids.companyB)}, 'ACTIVE') ON CONFLICT (id) DO UPDATE SET status = 'ACTIVE'`);
    await exec(`INSERT INTO membership_roles (membership_id, role_id, company_id) VALUES (${quote(ids.membershipA)}, ${quote(ids.roleA)}, ${quote(ids.companyA)}), (${quote(ids.membershipB)}, ${quote(ids.roleB)}, ${quote(ids.companyB)}) ON CONFLICT DO NOTHING`);
    await exec(`INSERT INTO role_permissions (role_id, permission_id) SELECT ${quote(ids.roleA)}, id FROM permissions WHERE code = 'operational-demo.read' ON CONFLICT DO NOTHING`);
    await exec(`INSERT INTO role_permissions (role_id, permission_id) SELECT ${quote(ids.roleB)}, id FROM permissions WHERE code IN ('operational-demo.read', 'operational-demo.update', 'operational-demo.action') ON CONFLICT DO NOTHING`);
    await exec(`INSERT INTO role_permissions (role_id, permission_id) SELECT ${quote(ids.roleA)}, id FROM permissions WHERE code = 'operational-demo.create' ON CONFLICT DO NOTHING`);
    await exec(`INSERT INTO role_permissions (role_id, permission_id) SELECT ${quote(ids.platformRole)}, id FROM permissions WHERE code = 'platform.admin' ON CONFLICT DO NOTHING`);
    await exec(`INSERT INTO menu_modules (id, name, sort_order, status) VALUES (${quote(ids.module)}, 'Operaciones', 1, 'ACTIVE') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'ACTIVE'`);
     await exec(`INSERT INTO menu_items (id, module_id, parent_id, name, route, sort_order, status) VALUES (${quote(ids.adminMenuConfig)}, ${quote(ids.module)}, NULL, 'Configuración', NULL, 2, 'ACTIVE'), (${quote(ids.adminMenuRoles)}, ${quote(ids.module)}, ${quote(ids.adminMenuConfig)}, 'Roles', '/platform-admin/roles', 4, 'ACTIVE'), (${quote(ids.adminMenuUsuarios)}, ${quote(ids.module)}, ${quote(ids.adminMenuConfig)}, 'Usuarios', '/platform-admin/usuarios', 5, 'ACTIVE'), (${quote(ids.adminMenuEmpresas)}, ${quote(ids.module)}, ${quote(ids.adminMenuConfig)}, 'Empresas', '/platform-admin/empresas', 6, 'ACTIVE'), (${quote(ids.adminMenuMenus)}, ${quote(ids.module)}, ${quote(ids.adminMenuConfig)}, 'Menús', '/platform-admin/menus', 7, 'ACTIVE'), (${quote(ids.adminMenuServicios)}, ${quote(ids.module)}, ${quote(ids.adminMenuConfig)}, 'Servicios', '/platform-admin/servicios', 8, 'ACTIVE') ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = 'ACTIVE', route = EXCLUDED.route, parent_id = EXCLUDED.parent_id`);
     await exec(`INSERT INTO menu_permissions (menu_item_id, permission_id) SELECT id, (SELECT id FROM permissions WHERE code = 'platform.admin') FROM menu_items WHERE id IN ('${ids.adminMenuRoles}', '${ids.adminMenuUsuarios}', '${ids.adminMenuEmpresas}', '${ids.adminMenuMenus}', '${ids.adminMenuServicios}') ON CONFLICT DO NOTHING`);
    await exec(`INSERT INTO services (id, code, name, description, status) VALUES (${quote(ids.serviceWater)}, 'acueducto', 'Acueducto', 'Gestión del servicio de acueducto.', 'ACTIVE'), (${quote(ids.serviceEnergy)}, 'energia', 'Energía', 'Gestión del servicio de energía eléctrica.', 'ACTIVE'), (${quote(ids.serviceGas)}, 'gas', 'Gas', 'Gestión del servicio de gas.', 'ACTIVE') ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, status = EXCLUDED.status`);
    await exec(`INSERT INTO company_services (id, company_id, service_id, status) VALUES ('00000000-0000-4000-8000-000000000081', ${quote(ids.companyA)}, ${quote(ids.serviceWater)}, 'ACTIVE'), ('00000000-0000-4000-8000-000000000082', ${quote(ids.companyA)}, ${quote(ids.serviceEnergy)}, 'ACTIVE'), ('00000000-0000-4000-8000-000000000083', ${quote(ids.companyB)}, ${quote(ids.serviceGas)}, 'ACTIVE') ON CONFLICT (company_id, service_id) DO UPDATE SET status = 'ACTIVE'`);
    await exec(`INSERT INTO operational_demo_records (id, company_id, service_code, label, status) VALUES ('00000000-0000-4000-8000-000000000061', ${quote(ids.companyA)}, 'acueducto', 'Registro de Empresa A', 'ACTIVE'), ('00000000-0000-4000-8000-000000000062', ${quote(ids.companyB)}, 'gas', 'Registro de Empresa B', 'ACTIVE') ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label, service_code = EXCLUDED.service_code, status = 'ACTIVE'`);
  };
  run().finally(() => disconnect?.()).catch((error) => { console.error(error); process.exitCode = 1; });
}
