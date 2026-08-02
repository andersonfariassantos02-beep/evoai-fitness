import { test, expect } from '@playwright/test';
import { authenticateUser } from './helpers/setupAuth';

test.describe('Administração de Usuários', () => {
  test('Usuário comum não possui link de administração de usuários no menu', async ({ page }) => {
    await authenticateUser(page, { isAdmin: false });

    await page.goto('/#/app');

    await expect(page.getByRole('link', { name: 'Usuários', exact: true })).toHaveCount(0);
  });

  test('Administrador acessa a página de usuários e visualiza a listagem', async ({ page }) => {
    await authenticateUser(page, { isAdmin: true });

    await page.goto('/#/admin/usuarios');

    await expect(page.getByRole('heading', { name: /Usuários e acessos/i })).toBeVisible();
    await expect(page.locator('main.admin-shell')).toBeVisible();
  });
});
