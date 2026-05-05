import { expect, test } from "@playwright/test";
import {
  e2eCleanCredentials,
  gotoAuthenticatedPage,
  loginWithEmail,
  skipCleanAuthenticatedFlowWhenNeeded
} from "./helpers";

test.describe("onboarding de usuário limpo", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }, testInfo) => {
    const skipReason = skipCleanAuthenticatedFlowWhenNeeded(testInfo);
    test.skip(Boolean(skipReason), skipReason ?? undefined);

    await loginWithEmail(page, e2eCleanCredentials);
  });

  test("guia o usuário de primeira carteira para importação e Home inicial", async ({ page }) => {
    const marker = `Onboarding limpo ${Date.now()}`;
    const walletName = `Carteira ${marker}`;

    await gotoAuthenticatedPage(page, "/accounts?mode=choose&first=1");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: /Como você quer começar/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Prefiro começar importando extrato CSV/i })).toBeVisible();

    await page.getByRole("link", { name: /Carteira física/i }).click();
    const walletDialog = page.getByRole("dialog");
    await expect(walletDialog.getByRole("heading", { name: /Crie sua primeira carteira/i })).toBeVisible();
    await walletDialog.locator('input[name="name"]').fill(walletName);
    await walletDialog.locator('input[name="openingBalance"]').fill("350");
    await walletDialog.getByRole("button", { name: /Criar e continuar/i }).click();
    await expect(page.getByText(walletName, { exact: true }).first()).toBeVisible({ timeout: 20_000 });

    await gotoAuthenticatedPage(page, "/imports?onboarding=1");
    await expect(page.getByRole("heading", { name: /Comece importando seu extrato/i })).toBeVisible();
    await page.locator('select[name="accountId"]').selectOption({ label: `${walletName} (BRL)` });
    await page
      .locator('textarea[name="statementText"]')
      .fill(`date,description,amount\n2026-05-05,${marker} mercado,-42.90`);
    await expect(page.getByText(`${marker} mercado`).first()).toBeVisible();
    await page.getByRole("button", { name: /Importar extrato/i }).click();
    await expect(page.getByText(/importado|importação/i).first()).toBeVisible({ timeout: 20_000 });

    await gotoAuthenticatedPage(page, "/");
    await expect(
      page.getByText(/Seu próximo passo|Consultor guiado|Centro de comando/i).first()
    ).toBeVisible();
  });
});
