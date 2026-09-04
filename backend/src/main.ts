import { config as loadDotenv } from 'dotenv';

loadDotenv({ path: new URL('../../.env', import.meta.url) });
import { NestFactory } from '@nestjs/core';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { createApplication } from './app.ts';
import { createHttpModule } from './http.module.ts';
import { loadConfig } from './common/config.ts';
import { PrismaSessionRepository } from './auth/session.service.ts';
import { CompaniesService, PrismaCompanyRepository } from './companies/companies.service.ts';
import { MenuService, PrismaMenuRepository, MenuAdminService, PrismaMenuAdminRepository } from './menu/menu.service.ts';
import { RolesService, PrismaRoleRepository } from './roles/roles.service.ts';
import { PermissionsService, PrismaPermissionRepository } from './permissions/permissions.service.ts';
import { PermissionResolver, PrismaAuthorizationRepository } from './authorization/resolver.ts';
import { AuditService } from './audit/audit.service.ts';
import { OperationalDemoService, PrismaOperationalDemoRepository } from './operational-demo/operational-demo.service.ts';
import { UsersService, PrismaUserRepository } from './users/users.service.ts';
import { ServicesService, PrismaServiceRepository } from './services/services.service.ts';

export async function bootstrap() {
  const config = loadConfig();
  const adapter = new PrismaPg({ connectionString: (config as { DATABASE_URL?: string }).DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  const authorizationRepository = new PrismaAuthorizationRepository(prisma.membership as any, prisma.role as any, prisma.platformRoleAssignment as any);
  const users = await prisma.user.findMany();
  const authUsers = users.map(user => ({ id: user.id, email: user.email, name: user.name, passwordHash: user.passwordHash, status: user.status }));
  const audit = new AuditService(prisma.auditEvent as any);
  const application = createApplication({
    audit,
    users: authUsers,
    usersService: new UsersService(authUsers, new PrismaUserRepository(prisma.user), async event => { await audit.append(event as never); }),
    sessionRepository: new PrismaSessionRepository(prisma.session),
    companies: new CompaniesService([], [], undefined, new PrismaCompanyRepository(prisma as any)),
    menu: new MenuService([], new PrismaMenuRepository(prisma.menuItem as any)),
    menuAdmin: new MenuAdminService(new PrismaMenuAdminRepository(prisma as any)),
    roles: new RolesService(new PrismaRoleRepository(prisma as any)),
    permissions: new PermissionsService(new PrismaPermissionRepository(prisma as any)),
    authorization: new PermissionResolver(authorizationRepository),
    operationalDemo: new OperationalDemoService(new PrismaOperationalDemoRepository(prisma as any)),
    services: new ServicesService(new PrismaServiceRepository(prisma as any), async event => { await audit.append(event as never); }),
  });
  const server = await NestFactory.create(createHttpModule(application), { logger: false });
  server.enableShutdownHooks();
  await server.listen(config.port, '0.0.0.0');
  const close = async () => { await server.close(); await prisma.$disconnect(); };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
  return { server, prisma, application };
}

if (import.meta.url === `file://${process.argv[1]}`) await bootstrap();
