import { expect, test, type APIRequestContext, type Page } from '@playwright/test';

const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';
const password = 'Cambiar1234!';
const admin = { email: 'admin@sic.test', password };
const tenant = { email: 'operaciones@sic.test', password };
const companyA = '00000000-0000-4000-8000-000000000011';
const companyB = '00000000-0000-4000-8000-000000000012';
const readPermission = '00000000-0000-4000-8000-000000000052';
const recordB = '00000000-0000-4000-8000-000000000062';

async function login(request: APIRequestContext, credentials: typeof admin) {
  const response = await request.post(`${apiURL}/v1/auth/login`, { data: credentials });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).accessToken as string;
}

async function signIn(page: Page, credentials: typeof admin) {
  await page.goto('/login');
  await page.getByLabel('Correo electrónico').fill(credentials.email);
  await page.getByLabel('Contraseña').fill(credentials.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function selectCompany(page: Page, name: string) {
  await page.locator('#company-context').selectOption({ label: name });
  await expect(page.locator('#company-context')).toHaveValue(/.+/);
}

test('admin configuration and tenant A/B permission verification', async ({ page, request }) => {
  const adminToken = await login(request, admin);
  const tenantToken = await login(request, tenant);

  try {
    await signIn(page, admin);
    await selectCompany(page, 'Empresa A');
    await page.goto('/platform-admin');
    await expect(page.getByRole('heading', { name: 'Administración de la plataforma', exact: true })).toBeVisible();
    await expect(page.getByText('Registrar persona', { exact: true })).toBeVisible();
    await expect(page.getByText('Vincular permiso a un rol', { exact: true })).toBeVisible();
    await expect(page.locator('mat-card-title', { hasText: '5. Servicios' })).toBeVisible();

    await page.getByRole('button', { name: /Cerrar sesión/i }).first().click().catch(() => undefined);
    await signIn(page, tenant);
    await selectCompany(page, 'Empresa A');
    await page.goto('/operational-demo');
    await expect(page.getByRole('heading', { name: 'Operaciones', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Crear registro' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actualizar', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Completar', exact: true })).not.toBeVisible();

    await selectCompany(page, 'Empresa B');
    await page.goto('/operational-demo');
    await expect(page.getByRole('button', { name: 'Crear registro' })).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Actualizar', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Completar', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Eliminar', exact: true })).not.toBeVisible();

    const denied = await request.patch(`${apiURL}/v1/platform/permissions/${readPermission}`, {
      headers: { authorization: `Bearer ${adminToken}` },
      data: { status: 'INACTIVE' },
    });
    expect(denied.status()).toBe(200);
    const directDenial = await request.get(`${apiURL}/v1/companies/${companyB}/operational-demo-records/${recordB}`, {
      headers: { authorization: `Bearer ${tenantToken}`, 'x-company-id': companyB },
    });
    expect(directDenial.status()).toBe(403);
    await expect(page.getByRole('button', { name: 'Actualizar', exact: true })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('button', { name: 'Actualizar', exact: true })).not.toBeVisible();
    await expect(page.getByText('No hay una empresa activa disponible.')).not.toBeVisible();
  } finally {
    // Close the page first so an in-flight page cannot hold the cleanup request; then restore the permission.
    // Both steps are best-effort so a closed browser context cannot hang or fail teardown.
    await page.close().catch(() => undefined);
    await request
      .patch(`${apiURL}/v1/platform/permissions/${readPermission}`, {
        headers: { authorization: `Bearer ${adminToken}` },
        data: { status: 'ACTIVE' },
      })
      .catch(() => undefined);
  }
});
