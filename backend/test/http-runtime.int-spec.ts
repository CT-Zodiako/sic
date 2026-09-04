import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import test from 'node:test';

const port = 4317;

test('HTTP runtime serves health through the Nest bridge', async () => {
  const child = spawn(process.execPath, ['--experimental-transform-types', 'backend/src/main.ts'], {
    cwd: new URL('../..', import.meta.url).pathname,
    env: { ...process.env, PORT: String(port) },
    stdio: 'pipe',
  });
  try {
    const deadline = Date.now() + 15_000;
    let response: Response | undefined;
    while (Date.now() < deadline) {
      try { response = await fetch(`http://127.0.0.1:${port}/v1/health`, { headers: { 'x-request-id': 'runtime-smoke' } }); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 250)); }
    }
    assert.ok(response, 'backend did not start in time');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
    assert.equal(response.headers.get('x-request-id'), 'runtime-smoke');
  } finally {
    child.kill('SIGTERM');
    await new Promise<void>(resolve => child.once('exit', () => resolve()));
  }
});
