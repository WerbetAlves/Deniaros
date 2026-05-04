import { expect, test } from "@playwright/test";
import {
  allowE2eMutation,
  futureIsoDate,
  gotoAuthenticatedPage,
  loginWithEmail,
  skipAuthenticatedFlowWhenNeeded
} from "./helpers";

test.describe("fluxo real de cliente autenticado", () => {
  test.setTimeout(120_000);

  test.beforeEach(async ({ page }, testInfo) => {
    const skipReason = skipAuthenticatedFlowWhenNeeded(testInfo);
    test.skip(Boolean(skipReason), skipReason ?? undefined);

    await loginWithEmail(page);
  });

  test("cliente navega pelos pilares do produto sem perder contexto", async ({ page }) => {
    await gotoAuthenticatedPage(page, "/");
    await expect(page.getByRole("heading", { name: /Início|Home Page|Centro de comando/i })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Novo movimento/i }).or(page.getByRole("button", { name: /Novo movimento/i }))
        .first()
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /Ver agenda/i }).or(page.getByRole("button", { name: /Ver agenda/i }))
        .first()
    ).toBeVisible();

    await gotoAuthenticatedPage(page, "/accounts");
    await expect(page.getByRole("heading", { name: /Carteiras/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /Adicionar carteira/i }).first()).toBeVisible();

    await gotoAuthenticatedPage(page, "/financial-agenda");
    await expect(page.getByRole("heading", { name: /Agenda/i }).first()).toBeVisible();
    await page.getByRole("button", { name: "Nova conta" }).click();
    const agendaDialog = page.getByRole("dialog");
    await expect(agendaDialog).toBeVisible();
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await agendaDialog.getByRole("button", { name: "Fechar", exact: true }).click();

    await gotoAuthenticatedPage(page, "/reports?section=habits&report=where-money-goes");
    await expect(page.getByRole("heading", { name: /Relat/i }).first()).toBeVisible();

    await gotoAuthenticatedPage(page, "/support");
    await expect(page.getByRole("heading", { name: /Chat e Suporte|Consultor/i }).first()).toBeVisible();

    await gotoAuthenticatedPage(page, "/billing");
    await expect(page.getByRole("heading", { name: /Planos|Assinatura|Billing/i }).first()).toBeVisible();
  });

  test("cliente registra movimento, agenda conta futura e encerra sessão", async ({ page }) => {
    test.skip(!allowE2eMutation, "Defina E2E_ALLOW_MUTATION=1 para criar dados no workspace de teste.");

    const marker = `E2E cliente ${Date.now()}`;
    const scheduledMarker = `Conta futura ${marker}`;

    await gotoAuthenticatedPage(page, "/transactions/new");
    await page.locator('select[name="accountId"]').selectOption({ index: 1 });
    await page.locator('input[name="description"]').fill(marker);
    await page.locator('input[name="amount"]').fill("12.34");
    await page.getByRole("button", { name: "Salvar lançamento" }).click();
    await expect(page.getByText(marker, { exact: true }).first()).toBeVisible({ timeout: 20_000 });

    await gotoAuthenticatedPage(page, "/financial-agenda");
    await page.getByRole("button", { name: "Nova conta" }).click();
    await page.locator('input[name="title"]').fill(scheduledMarker);
    await page.locator('input[name="amount"]').fill("45.67");
    await page.locator('input[name="dueDate"]').fill(futureIsoDate(10));
    await page.getByRole("button", { name: "Criar compromisso" }).click();
    await expect(page.getByText(scheduledMarker, { exact: true }).first()).toBeVisible({ timeout: 20_000 });

    await page.getByLabel("Sair da conta").click();
    await expect(page).toHaveURL(/\/login/);
  });
});
