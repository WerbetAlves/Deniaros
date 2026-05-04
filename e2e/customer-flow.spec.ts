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

  test("cliente executa fluxo ponta a ponta com dados reais do workspace", async ({ page }) => {
    test.skip(!allowE2eMutation, "Defina E2E_ALLOW_MUTATION=1 para criar dados no workspace de teste.");

    const marker = `E2E cliente ${Date.now()}`;
    const walletMarker = `Carteira ${marker}`;
    const scheduledMarker = `Conta futura ${marker}`;
    const supportMarker = `Suporte ${marker}`;

    await gotoAuthenticatedPage(page, "/accounts?mode=create&kind=cash");
    const walletDialog = page.getByRole("dialog");
    await expect(walletDialog).toBeVisible();
    await walletDialog.locator('input[name="name"]').fill(walletMarker);
    await walletDialog.locator('input[name="openingBalance"]').fill("123.45");
    await walletDialog.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText(walletMarker, { exact: true }).first()).toBeVisible({ timeout: 20_000 });

    await gotoAuthenticatedPage(page, "/transactions/new");
    const accountSelect = page.locator('select[name="accountId"]');
    const walletOptionValue = await accountSelect.locator("option", { hasText: walletMarker }).getAttribute("value");
    expect(walletOptionValue).toBeTruthy();
    await accountSelect.selectOption(walletOptionValue ?? "");
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

    await gotoAuthenticatedPage(page, "/reports?section=habits&report=where-money-goes");
    await expect(page.getByRole("heading", { name: /Relat/i }).first()).toBeVisible();

    await gotoAuthenticatedPage(page, "/assistant");
    await expect(page.getByRole("heading", { name: /Consultor IA|Converse com seu Deniaros/i }).first()).toBeVisible();
    await page.locator(".assistant-compose textarea").fill(`Analise o lançamento ${marker} e me diga o próximo passo.`);
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.locator(".assistant-message.assistant").last()).toBeVisible({ timeout: 30_000 });

    await gotoAuthenticatedPage(page, "/support");
    await expect(page.getByRole("heading", { name: /Chat e Suporte|Suporte/i }).first()).toBeVisible();
    const supportForm = page.locator("#ticket-form form");
    await supportForm.locator('input[name="title"]').fill(supportMarker);
    await supportForm.locator('textarea[name="description"]').fill(
      `Ticket criado pelo E2E autenticado para validar suporte operacional do marcador ${marker}.`
    );
    await supportForm.locator('select[name="area"]').selectOption("technical");
    await supportForm.locator('select[name="priority"]').selectOption("low");
    await supportForm.getByRole("button", { name: "Abrir ticket" }).click();
    await expect(page.getByText(supportMarker, { exact: true }).first()).toBeVisible({ timeout: 20_000 });

    await gotoAuthenticatedPage(page, "/billing");
    await expect(page.getByRole("heading", { name: /Planos|Assinatura|Billing/i }).first()).toBeVisible();
    await expect(page.getByText(/Plano atual|Assinatura e planos/i).first()).toBeVisible();

    await page.getByLabel("Sair da conta").click();
    await expect(page).toHaveURL(/\/login/);
  });
});
