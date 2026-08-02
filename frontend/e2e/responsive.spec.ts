import { test, expect } from '@playwright/test';

test.describe('Responsividade e Layout', () => {
  test('Menu mobile deve abrir, fechar e não esconder conteúdo', async ({ page, isMobile }) => {
    if (!isMobile) return; 

    await page.goto('/');

    const menuButton = page.getByRole('button', { name: /menu/i });
    const navMenu = page.getByRole('navigation');

    await menuButton.click();
    await expect(navMenu).toBeVisible();

    await navMenu.getByRole('link').first().click();
    await expect(navMenu).toBeHidden();

    const isScrollableX = await page.evaluate(() => document.body.scrollWidth > window.innerWidth);
    expect(isScrollableX).toBeFalsy();
  });
});