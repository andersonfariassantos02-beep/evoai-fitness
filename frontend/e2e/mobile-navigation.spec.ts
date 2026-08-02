import { test, expect } from '@playwright/test';
import { authenticateUser } from './helpers/setupAuth';

test.describe('Menu e Navegação Mobile Responsiva', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page, { isAdmin: true });
  });

  test('Exibe header mobile e esconde a sidebar desktop em telas menores', async ({ page, isMobile }) => {
    await page.goto('/#/app');

    if (isMobile) {
      await expect(page.locator('.app-mobile-header')).toBeVisible();
      await expect(page.locator('.app-sidebar')).not.toBeVisible();
    } else {
      await expect(page.locator('.app-sidebar')).toBeVisible();
      await expect(page.locator('.app-mobile-header')).not.toBeVisible();
    }
  });

  test('Abre o menu mobile e navega para Perfil', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Teste específico para ambiente mobile');

    await page.goto('/#/app');

    const mobileMenu = page.locator('details.app-mobile-menu');
    await expect(mobileMenu).toBeVisible();

    // Abre o menu mobile
    await page.locator('details.app-mobile-menu summary').click();
    await expect(mobileMenu).toHaveAttribute('open', '');

    // Clica no link Perfil no menu mobile
    await mobileMenu.locator('a[href="#/perfil"]').click();
    await expect(page).toHaveURL(/.*#\/perfil/);

    // O menu deve ser fechado após a navegação
    await expect(mobileMenu).not.toHaveAttribute('open', '');
  });
});
