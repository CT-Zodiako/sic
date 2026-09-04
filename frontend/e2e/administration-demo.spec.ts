import assert from 'node:assert/strict';
import test from 'node:test';
import { PlatformAdminScreen } from '../src/app/features/platform-admin/platform-admin.screen.ts';
import { OperationalDemoScreen } from '../src/app/features/operational-demo/operational-demo.screen.ts';

const transport = { handle: async () => ({ status: 200, body: { items: [], page: 1, pageSize: 20, total: 0 } }) };
test('administration smoke exposes labelled regions and safe feedback', () => {
  const screen = new PlatformAdminScreen(transport);
  assert.match(screen.render(), /aria-label="Administración de la plataforma"/);
  assert.match(screen.render(), /aria-live/);
});
test('demo smoke requires selected company before tenant access', async () => {
  const screen = new OperationalDemoScreen(transport, { selectedCompanyId: null });
  await assert.rejects(screen.load(), /contexto de empresa/);
});
