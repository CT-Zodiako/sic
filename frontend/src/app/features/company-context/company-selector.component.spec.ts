import assert from 'node:assert/strict';
import test from 'node:test';
import { CompanySelectorComponent } from './company-selector.component.ts';

test('selector exposes labelled loading, empty, and error states', () => {
  const component = new CompanySelectorComponent({} as any);
  assert.match(component.statusMessage('loading-companies'), /Cargando empresas/);
  assert.match(component.statusMessage('no-company'), /No hay empresas/);
  assert.match(component.statusMessage('invalidated'), /Acceso denegado/);
});
