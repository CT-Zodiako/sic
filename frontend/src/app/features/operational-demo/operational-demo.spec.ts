import assert from 'node:assert/strict';
import test from 'node:test';
import { OperationalDemoApiClient } from './operational-demo.api.ts';
import { OperationalDemoScreen } from './operational-demo.screen.ts';

test('service context sends X-Service-Code and filters records by service', async () => {
  const requests: any[] = [];
  const transport = { handle: async (request: any) => { requests.push(request); return { status: 200, body: [] }; } };
  const screen = new OperationalDemoScreen(new OperationalDemoApiClient(transport as never), { selectedCompanyId: 'company-a' });
  screen.setService('acueducto');
  await screen.load();
  assert.equal(requests[0].headers['X-Service-Code'], 'acueducto');
  screen.setService(undefined);
  await screen.load();
  assert.equal(requests[1].headers['X-Service-Code'], undefined);
});

test('operational demo marks tenant requests and hides action errors safely', async () => {
  const requests: any[] = [];
  const transport = { handle: async (request: any) => { requests.push(request); return { status: 200, body: [] }; } };
  const screen = new OperationalDemoScreen(new OperationalDemoApiClient(transport), { selectedCompanyId: 'company-a' });
  await screen.load();
  assert.equal(requests[0].url, '/v1/companies/company-a/operational-demo-records');
  assert.equal(requests[0].context.get((await import('../../core/http.ts')).COMPANY_SCOPED), true);
  await screen.create({ label: '' });
  assert.equal(screen.state.errors.label, 'label es obligatorio.');
});

test('operational demo renders a table, form, and accessible feedback', async () => {
      const screen = new OperationalDemoScreen({ handle: async () => ({ status: 200, body: [] }) }, { selectedCompanyId: 'company-a' });
      assert.match(screen.render(), /aria-label="Registros"/);
      assert.match(screen.render(), /aria-live/);
    });

    test('operational demo maps action calls to the action endpoint and permission visibility', async () => {
      const requests: any[] = [];
      const transport = { handle: async (request: any) => { requests.push(request); return { status: 200, body: { id: 'a', companyId: 'company-a', label: 'A', status: 'INACTIVE' } }; } };
      const screen = new OperationalDemoScreen(new OperationalDemoApiClient(transport), { selectedCompanyId: 'company-a', can: (code: string) => code === 'operational-demo.action' } as any);
      assert.equal(screen.can('action'), true);
      await screen.complete('a');
      assert.match(requests[0].url, /\/actions\/complete$/);
      assert.equal(requests[0].method, 'POST');
    });

    test('operational demo reports forbidden actions without leaking backend detail', async () => {
  const transport = { handle: async () => { throw Object.assign(new Error('forbidden'), { status: 403, error: { detail: 'internal tenant detail' } }); } };
  const screen = new OperationalDemoScreen(new OperationalDemoApiClient(transport), { selectedCompanyId: 'company-a' });
  await assert.rejects(screen.complete('record-b'));
  assert.equal(screen.message, 'No tienes permiso para realizar esta acción.');
});
