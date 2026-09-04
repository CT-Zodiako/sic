import assert from 'node:assert/strict';
import test from 'node:test';
import { PlatformAdminApiClient } from './platform-admin.api.ts';
import { PlatformAdminScreen } from './platform-admin.screen.ts';

const page = { items: [], page: 1, pageSize: 20, total: 0 };

test('platform client uses platform endpoints without tenant context and validates forms', async () => {
  const requests: any[] = [];
  const transport = { handle: async (request: any) => { requests.push(request); return { status: 200, body: page }; } };
  const screen = new PlatformAdminScreen(new PlatformAdminApiClient(transport));
  const result = await screen.createUser({ email: '', name: '', password: '' });
  assert.equal(result, undefined);
  assert.deepEqual(Object.keys(screen.state.errors).sort(), ['email', 'name', 'password']);
  await screen.createCompany({ name: 'Company A' });
  assert.equal(requests[0].url, '/v1/platform/companies');
  assert.equal(requests[0].headers['X-Company-Id'], undefined);
});

test('administration screen exposes Material regions and validates email fields', async () => {
      const screen = new PlatformAdminScreen({ handle: async () => ({ status: 200, body: page }) });
      assert.match(screen.render(), /mat-table/);
      assert.match(screen.render(), /aria-live/);
      await screen.createUser({ email: 'not-an-email', name: 'A', password: 'secret' });
      assert.equal(screen.state.errors.email, 'El correo electrónico no es válido.');
    });

    test('admin workflow names every configuration section and exposes lifecycle actions', async () => {
      const screen = new PlatformAdminScreen({ handle: async () => ({ status: 200, body: page }) });
      const markup = screen.render();
      for (const label of ['1. Permisos', '2. Roles', '3. Asignaciones', '4. Menús', '5. Servicios']) assert.match(markup, new RegExp(label));
      assert.match(markup, /Desactivar/);
    });

    test('services section manages catalog and assignments with safe payloads', async () => {
      const requests: any[] = [];
      const transport = { handle: async (request: any) => { requests.push(request); return { status: 200, body: page }; } };
      const screen = new PlatformAdminScreen(new PlatformAdminApiClient(transport));
      await screen.createService({ code: 'telecom', name: 'Telecomunicaciones', description: 'Gestión de telecomunicaciones.' });
      await screen.assignService('company-1', 'service-1');
      await screen.deactivateService('service-1');
      await screen.deactivateServiceAssignment('assignment-1');
      assert.deepEqual(requests.filter(request => request.method !== 'GET' && request.url.includes('service')).map(request => [request.method, request.url, request.body]), [
        ['POST', '/v1/platform/services', { code: 'telecom', name: 'Telecomunicaciones', description: 'Gestión de telecomunicaciones.' }],
        ['POST', '/v1/platform/company-services', { companyId: 'company-1', serviceId: 'service-1' }],
        ['PATCH', '/v1/platform/services/service-1', { status: 'INACTIVE' }],
        ['PATCH', '/v1/platform/company-services/assignment-1', { status: 'INACTIVE' }],
      ]);
    });

    test('admin lifecycle actions use safe PATCH payloads', async () => {
      const requests: any[] = [];
      const transport = { handle: async (request: any) => { requests.push(request); return { status: 200, body: page }; } };
      const screen = new PlatformAdminScreen(new PlatformAdminApiClient(transport));
      await screen.deactivateCompany('company-1');
      await screen.deactivatePermission('permission-1');
      await screen.deactivateRole('role-1');
      assert.deepEqual(requests.filter(request => request.method === 'PATCH').map(request => [request.method, request.url, request.body]), [
        ['PATCH', '/v1/platform/companies/company-1', { status: 'INACTIVE' }],
        ['PATCH', '/v1/platform/permissions/permission-1', { status: 'INACTIVE' }],
        ['PATCH', '/v1/platform/roles/role-1', { status: 'INACTIVE' }],
      ]);
    });

    test('menu URL editing sends only the allow-listed route and refreshes the menu', async () => {
      const requests: any[] = [];
      let currentRoute = '/old-route';
      const menu = [{ id: 'menu-1', name: 'Operaciones', route: currentRoute, status: 'ACTIVE' }];
      const transport = { handle: async (request: any) => {
        requests.push(request);
        if (request.url === '/v1/platform/menu') return { status: 200, body: [{ ...menu[0], route: currentRoute }] };
        if (request.url === '/v1/platform/audit-events?take=50') return { status: 200, body: [] };
        if (request.method === 'PATCH') { currentRoute = request.body.route; return { status: 200, body: { ...menu[0], route: currentRoute } }; }
        return { status: 200, body: page };
      } };
      const screen = new PlatformAdminScreen(new PlatformAdminApiClient(transport));
      await screen.updateMenuRoute('menu-1', '  /operational-demo  ');
      assert.deepEqual(requests.find(request => request.method === 'PATCH').body, { route: '/operational-demo' });
      assert.equal(screen.menu[0].route, '/operational-demo');
      assert.equal(screen.state.message, 'Cambios guardados correctamente.');
    });

    test('menu URL editing validates a missing route without calling the API', async () => {
      const requests: any[] = [];
      const screen = new PlatformAdminScreen({ handle: async (request: any) => { requests.push(request); return { status: 200, body: page }; } });
      const result = await screen.updateMenuRoute('menu-1', '');
      assert.equal(result, undefined);
      assert.equal(screen.state.errors.route, 'La ruta es obligatoria.');
      assert.equal(requests.length, 0);
    });

    test('admin mutation reloads resources and current context', async () => {
  let reloads = 0; let contexts = 0;
  const transport = { handle: async () => ({ status: 200, body: page }) };
  const screen = new PlatformAdminScreen(new PlatformAdminApiClient(transport), {
    loadCompanies: async () => { reloads++; return []; },
    authorizationContext: async () => { contexts++; return {} as any; },
  });
  await screen.createUser({ email: 'a@example.test', name: 'A', password: 'secret' });
  assert.equal(reloads, 1); assert.equal(contexts, 1);
});

test('admin guide explains every step with purpose, example, and next action', () => {
  const screen = new PlatformAdminScreen({ handle: async () => ({ status: 200, body: page }) });
  const markup = screen.render();
  assert.match(markup, /Cómo configurar acceso/);
  for (const label of ['Permiso', 'Rol', 'Usuario en empresa', 'Menú', 'Acción', 'Operaciones']) assert.match(markup, new RegExp(label));
  assert.match(markup, /Qué hacés acá/);
  assert.match(markup, /Ejemplo/);
  assert.match(markup, /Siguiente paso/);
  assert.match(markup, /Empresa actual/);
  assert.match(markup, /Toda la plataforma/);
  assert.match(markup, /Solo una empresa/);
});

test('onboarding checklist reports progress across the configuration chain', () => {
  const screen = new PlatformAdminScreen({ handle: async () => ({ status: 200, body: page }) });
  assert.ok(screen.checklist().every(step => !step.done));
  screen.permissions = [{ id: 'p1', code: 'inventory.read', resource: 'inventory', action: 'read' }];
  screen.roles = [{ id: 'r1', name: 'Operador', scope: 'PLATFORM' }];
  screen.memberships = [{ id: 'm1', userId: 'u1', companyId: 'c1' }];
  screen.menu = [{ id: 'i1', name: 'Operaciones', status: 'ACTIVE', route: '/operational-demo' }];
  const steps = screen.checklist();
  assert.deepEqual(steps.map(step => step.label), ['Permiso', 'Rol', 'Usuario en empresa', 'Menú', 'Acción', 'Operaciones']);
  assert.deepEqual(steps.map(step => step.done), [true, true, true, true, true, false]);
  assert.match(steps[0].hint, /acciones/);
});

test('status and scope labels explain platform-wide versus company-scoped roles', () => {
  const screen = new PlatformAdminScreen({ handle: async () => ({ status: 200, body: page }) });
  assert.equal(screen.statusLabel('ACTIVE'), 'Activo');
  assert.equal(screen.statusLabel('INACTIVE'), 'Inactivo');
  assert.equal(screen.statusLabel(undefined), 'Activo');
  assert.equal(screen.scopeLabels.PLATFORM, 'Toda la plataforma');
  assert.equal(screen.scopeLabels.SHARED, 'Compartido entre empresas');
  assert.equal(screen.scopeLabels.COMPANY, 'Solo una empresa');
});

test('deactivation confirmations state consequences and reversibility', () => {
  const screen = new PlatformAdminScreen({ handle: async () => ({ status: 200, body: page }) });
  const permission = screen.confirmationMessage('permiso', 'inventory.read');
  assert.match(permission, /inventory\.read/);
  assert.match(permission, /dejarán de autorizar/);
  assert.match(permission, /reactivar/);
  assert.match(screen.confirmationMessage('rol', 'Operador'), /perderán los permisos/);
  assert.match(screen.confirmationMessage('asignación', 'Ana'), /perderá el acceso a la empresa/);
  assert.match(screen.confirmationMessage('elemento de menú', 'Operaciones'), /dejará de aparecer en la navegación/);
});

test('permission labels show a friendly Spanish name and keep the technical code as reference', () => {
  const screen = new PlatformAdminScreen({ handle: async () => ({ status: 200, body: page }) });
  assert.equal(screen.permissionLabel({ code: 'operational-demo.read' }), 'Leer registros');
  assert.equal(screen.permissionLabel({ code: 'operational-demo.create' }), 'Crear registros');
  assert.equal(screen.permissionLabel({ code: 'operational-demo.update' }), 'Actualizar registros');
  assert.equal(screen.permissionLabel({ code: 'operational-demo.delete' }), 'Eliminar registros');
  assert.equal(screen.permissionLabel({ code: 'operational-demo.action' }), 'Completar registro');
  assert.equal(screen.permissionLabel({ code: 'platform.admin' }), 'Administración de la plataforma');
  assert.equal(screen.permissionLabel({ code: 'inventory.read' }), 'inventory.read');
});
