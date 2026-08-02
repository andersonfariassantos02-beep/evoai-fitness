import { test, expect } from '@playwright/test';
import { authenticateUser } from './helpers/setupAuth';

test.describe('Laboratório Administrativo de Testes', () => {
  test('Administrador acessa a página do laboratório de testes', async ({ page }) => {
    await authenticateUser(page, { isAdmin: true });

    await page.goto('/#/admin/testes');

    await expect(page.getByRole('heading', { name: /Laboratório de testes/i })).toBeVisible();
    await expect(page.locator('main.test-lab')).toBeVisible();
  });
});
