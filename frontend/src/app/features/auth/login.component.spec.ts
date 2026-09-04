import assert from 'node:assert/strict';
import test from 'node:test';
import { LoginComponent } from './login.component.ts';

test('login form requires credentials and reports authentication failure', async () => {
  const component = new LoginComponent({ login: async () => { throw new Error('invalid credentials'); } } as never);
  assert.equal(component.form.valid, false);
  component.form.setValue({ email: 'admin@example.test', password: 'secret' });
  await component.submit();
  assert.equal(component.message, 'No se pudo iniciar sesión. Comprueba tus credenciales.');
});
