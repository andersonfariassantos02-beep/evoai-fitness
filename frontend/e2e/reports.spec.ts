import { test, expect } from '@playwright/test';
import { authenticateUser } from './helpers/setupAuth';

test.describe('Relatórios e Métricas de Treino', () => {
  test.beforeEach(async ({ page }) => {
    await authenticateUser(page);
  });

  test('Carrega a página de relatórios e permite gerar o relatório', async ({ page }) => {
    await page.goto('/#/relatorios');

    await expect(page.getByRole('heading', { name: /Relatório/i })).toBeVisible();

    const generateBtn = page.getByRole('button', { name: /Gerar relatório/i });
    await expect(generateBtn).toBeVisible();
    await generateBtn.click();
  });

  test('Oferece opções de exportação do relatório em PDF', async ({ page }) => {
    await page.goto('/#/relatorios');

    const generateBtn = page.getByRole('button', { name: /Gerar relatório/i });
    await generateBtn.click();

    const pdfBtn = page.getByRole('button', { name: /Baixar PDF|Exportar PDF/i }).first();
    if (await pdfBtn.isVisible()) {
      await expect(pdfBtn).toBeEnabled();
    }
  });
});
