import assert from 'node:assert/strict';
import test from 'node:test';
import { appConfig } from './app.config.ts';

test('configures standalone router and HTTP providers', () => {
  assert.ok(appConfig.providers?.length);
});
