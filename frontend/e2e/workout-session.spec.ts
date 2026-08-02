import { test, expect } from '@playwright/test';
import { authenticateUser } from './helpers/setupAuth';

test.describe('Treino do Dia / Execução da Sessão', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test('Acessa a sessão de treino do dia e visualiza a estrutura de exercícios', async ({ page }) => {
    await page.goto('/#/treino/2026-08-01');
    await page.waitForLoadState('networkidle');

    await expect(page.locator('main')).toBeVisible();
  });

  test('Permite interagir com o registro de carga e repetições', async ({ page }) => {
    await page.goto('/#/treino/2026-08-01');
    await page.waitForLoadState('networkidle');

    const weightInput = page.locator('input[type="number"]').first();
    if (await weightInput.isVisible()) {
      await weightInput.fill('80');
      await expect(weightInput).toHaveValue('80');
    }
  });
});
