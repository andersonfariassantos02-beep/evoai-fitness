import { test, expect } from '@playwright/test';

test.describe('Sequenciador e Calendário', () => {
  test('Sequência de treino: PUSH, PULL concluídos, LEGS transferido', async ({ page }) => {
    
    // 1. Mocks de Autenticação (Com asteriscos para capturar qualquer variação da URL)
    await page.route('**/auth/v1/token*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-token',
          token_type: 'bearer',
          expires_in: 3600,
          refresh_token: 'mock-refresh',
          user: { id: 'mock-user-id', email: 'teste@evoai.com' }
        })
      });
    });

    await page.route('**/auth/v1/user*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'mock-user-id', email: 'teste@evoai.com' })
      });
    });

    // 2. Mock do histórico: PUSH e PULL concluídos
    await page.route('**/rest/v1/workout_history*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, type: 'PUSH', status: 'completed', date: '2026-08-01' },
          { id: 2, type: 'PULL', status: 'completed', date: '2026-08-02' }
        ])
      });
    });

    // 3. Mock da sugestão apontando para LEGS
    await page.route('**/rest/v1/next_workout_suggestion*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ suggested_type: 'LEGS' }) 
      });
    });

    // 4. Executa o fluxo de login
    await page.goto('/login');
    await page.getByPlaceholder('voce@exemplo.com').fill('teste@evoai.com');
    await page.getByPlaceholder('Sua senha').fill('senha123');
    await page.getByRole('button', { name: 'Entrar' }).click();

    // 5. Validação no Painel
    await expect(page.getByText(/LEGS/i)).toBeVisible();
    await expect(page.getByText(/Superior B/i)).not.toBeVisible();
  });
});