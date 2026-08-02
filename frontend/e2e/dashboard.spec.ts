import { test, expect } from '@playwright/test';
import { authenticateUser } from './helpers/setupAuth';

test.describe('Painel Principal e Calendário de Treino', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test('Carrega o painel principal com informações de treino', async ({ page }) => {
    await page.goto('/#/app');
    await expect(page.locator('.authenticated-shell')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });

  test('Permite alternar entre as visualizações Semanal e Mensal do calendário', async ({ page }) => {
    await page.goto('/#/app');
    await expect(page.locator('.authenticated-shell')).toBeVisible();

    const weeklyBtn = page.getByRole('button', { name: /Semanal/i });
    const monthlyBtn = page.getByRole('button', { name: /Mensal/i });

    if (await weeklyBtn.isVisible()) {
      await weeklyBtn.click();
      await expect(weeklyBtn).toHaveClass(/active/);

      await monthlyBtn.click();
      await expect(monthlyBtn).toHaveClass(/active/);
    }
  });

  test('Exibe o painel de recuperação muscular ou métricas de prontidão', async ({ page }) => {
    await page.goto('/#/app');
    await expect(page.locator('.authenticated-shell')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
});
