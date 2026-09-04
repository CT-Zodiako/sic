import { expect, test, type APIRequestContext } from '@playwright/test';

const apiURL = process.env.PLAYWRIGHT_API_URL ?? 'http://localhost:3000';
const tenant = { email: 'operaciones@sic.test', password: 'Cambiar1234!' };
const companyA = '00000000-0000-4000-8000-000000000011';
const companyB = '00000000-0000-4000-8000-000000000012';

async function login(request: APIRequestContext) {
  const response = await request.post(`${apiURL}/v1/auth/login`, { data: tenant });
  expect(response.ok()).toBeTruthy();
  return (await response.json()).accessToken as string;
}

test.describe('release gate', () => {
  test('backend health and bootstrap login contract are available', async ({ request }) => {
    const health = await request.get(`${apiURL}/v1/health`);
    expect(health.ok()).toBeTruthy();
    expect(await health.json()).toEqual({ status: 'ok' });

    const response = await request.post(`${apiURL}/v1/auth/login`, { data: tenant });
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.user.email).toBe(tenant.email);
    expect(body.accessToken).toEqual(expect.any(String));
  });

  test('login screen renders in a real browser', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/SIC Platform Administration/);
    await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
    await expect(page.getByLabel('Correo electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Iniciar sesión' })).toBeVisible();
  });

  test('protected navigation redirects anonymous browser sessions to login', async ({ page }) => {
    await page.goto('/platform-admin');
    await expect(page).toHaveURL(/\/login\?returnUrl=%2Fplatform-admin/);
    await expect(page.getByRole('heading', { name: 'Bienvenido de nuevo' })).toBeVisible();
  });

  test('revoked session is rejected on the next protected request', async ({ request }) => {
    const token = await login(request);
    const me = await request.get(`${apiURL}/v1/auth/me`, { headers: { authorization: `Bearer ${token}` } });
    expect(me.status()).toBe(200);

    const logout = await request.post(`${apiURL}/v1/auth/logout`, { headers: { authorization: `Bearer ${token}` } });
    expect(logout.status()).toBe(200);
    const revoked = await request.get(`${apiURL}/v1/auth/me`, { headers: { authorization: `Bearer ${token}` } });
    expect(revoked.status()).toBe(401);
    expect((await revoked.json()).code).toBe('SESSION_REVOKED');
  });

  test('tenant bootstrap exposes both companies and distinct authorization contexts', async ({ request }) => {
    const token = await login(request);
    const companies = await request.get(`${apiURL}/v1/me/companies`, { headers: { authorization: `Bearer ${token}` } });
    expect(companies.status()).toBe(200);
    const ids = (await companies.json()).companies.map((company: { id: string }) => company.id);
    expect(ids).toEqual(expect.arrayContaining([companyA, companyB]));

    const contextA = await request.get(`${apiURL}/v1/me/authorization-context`, { headers: { authorization: `Bearer ${token}`, 'x-company-id': companyA } });
    const contextB = await request.get(`${apiURL}/v1/me/authorization-context`, { headers: { authorization: `Bearer ${token}`, 'x-company-id': companyB } });
    expect(contextA.status()).toBe(200);
    expect(contextB.status()).toBe(200);
    expect((await contextA.json()).company.id).toBe(companyA);
    expect((await contextB.json()).company.id).toBe(companyB);
  });
});
