import { test, expect } from '@playwright/test';
import { authenticateUser } from './helpers/setupAuth';

test.describe('Gestão de Perfil e Onboarding', () => {
  test('Exibe e permite editar dados do perfil', async ({ page }) => {
    await authenticateUser(page, { profileName: 'Atleta Teste' });

    await page.goto('/#/perfil');
    await expect(page.locator('.profile-shell')).toBeVisible();

    const nameInput = page.getByRole('textbox', { name: 'Nome', exact: true });
    await expect(nameInput).toHaveValue('Atleta Teste');

    await nameInput.fill('Atleta Editado');
    await page.getByRole('button', { name: 'Salvar perfil' }).click();

    await expect(page.locator('.profile-shell')).toContainText('Perfil e preferências de treino salvos');
  });

  test('Permite adicionar nova restrição ao perfil', async ({ page }) => {
    await authenticateUser(page);

    await page.goto('/#/perfil');
    await expect(page.locator('.profile-shell')).toBeVisible();

    const descInput = page.getByRole('textbox', { name: /Descrição/i });
    await expect(descInput).toBeVisible();
    await descInput.fill('Evitar rotação excessiva de joelho');
    await page.getByRole('button', { name: 'Adicionar restrição' }).click();
    await expect(page.getByRole('status')).toContainText('Restrição adicionada');
  });

  test('Redireciona para onboarding quando a conta não possui perfil vinculado', async ({ page }) => {
    await authenticateUser(page, { hasProfile: false });

    await page.goto('/#/app');
    await expect(page).toHaveURL(/.*#\/onboarding/);
  });
});
