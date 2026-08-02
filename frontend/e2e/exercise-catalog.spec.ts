import { test, expect } from '@playwright/test';
import { authenticateUser } from './helpers/setupAuth';

test.describe('Catálogo de Exercícios (Admin)', () => {
  test('Administrador acessa o catálogo e visualiza as seções de grupo muscular', async ({ page }) => {
    await authenticateUser(page, { isAdmin: true });

    await page.goto('/#/admin/exercicios');

    await expect(page.getByRole('heading', { name: /Banco Mestre de Exercícios/i })).toBeVisible();
    await expect(page.locator('main.catalog-admin-page')).toBeVisible();
  });

  test('Exibe botão para cadastrar novo exercício', async ({ page }) => {
    await authenticateUser(page, { isAdmin: true });

    await page.goto('/#/admin/exercicios');

    const addBtn = page.getByRole('button', { name: /\+ Novo exercício|Novo exercício/i }).first();
    await expect(addBtn).toBeVisible();
  });
});
