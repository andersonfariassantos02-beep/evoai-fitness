import { test, expect } from '@playwright/test';

test.describe('Fluxos de Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    // Intercepta a chamada de login do Supabase
    await page.route('**/auth/v1/token?grant_type=password', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');

      if (postData.email === 'teste@evoai.com' && postData.password === 'senha123') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            access_token: 'mock-token',
            user: { id: 'mock-user-id', email: 'teste@evoai.com' }
          })
        });
      } else {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error_description: 'Invalid login credentials' })
        });
      }
    });
  });

  test('deve realizar login simulado com sucesso', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder(/e-mail/i).fill('teste@evoai.com');
    await page.getByPlaceholder(/senha/i).fill('senha123');
    await page.getByRole('button', { name: /entrar/i }).click();

    // Aguarda painel aparecer
    await expect(page.getByRole('heading', { name: /painel/i })).toBeVisible();
  });
});