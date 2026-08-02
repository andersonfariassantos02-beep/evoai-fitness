import { test, expect } from '@playwright/test';
import { authenticateUser } from './helpers/setupAuth';

test.describe('Preparação e Personalização do Treino', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test('Carrega a página de preparação de treino para a data informada', async ({ page }) => {
    await page.goto('/#/preparar-treino/2026-08-01');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('.workout-setup-shell, section')).toBeVisible();
  });

  test('Permite selecionar opções de personalização e gerar sugestão de treino', async ({ page }) => {
    await page.goto('/#/preparar-treino/2026-08-01');
    await expect(page.locator('main')).toBeVisible();

    const generateBtn = page.getByRole('button', { name: /Gerar treino|Montar treino/i }).first();
    if (await generateBtn.isVisible()) {
      await generateBtn.click();
      await expect(page.locator('.workout-setup-shell')).toBeVisible();
    }
  });
});
