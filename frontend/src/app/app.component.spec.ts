import assert from 'node:assert/strict';
import test from 'node:test';
import { AppComponent } from './app.component.ts';

test('renders the platform administration title', () => {
  assert.equal(new AppComponent().render(), '<main>Servicios SIC</main>');
});

test('uses the configured application title', () => {
  assert.equal(new AppComponent('Tenant Console').render(), '<main>Tenant Console</main>');
});
