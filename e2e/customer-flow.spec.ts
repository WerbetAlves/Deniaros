import { expect, test } from "@playwright/test";
import {
  allowE2eMutation,
  futureIsoDate,
  loginWithEmail,
  skipAuthenticatedFlowWhenNeeded
} from "./helpers";

test.describe("fluxo real de cliente autenticado", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const skipReason = skipAuthenticatedFlowWhenNeeded(testInfo);
    test.skip(Boolean(skipReason), skipReason ?? undefined);

    await loginWithEmail(page);
  });

  test("cliente navega pelos pilares do produto sem perder contexto", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: /Novo movimento/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Ver agenda/i })).toBeVisible();

    await page.goto("/accounts");
    await expect(page.getByRole("heading", { name: /Carteiras/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Adicionar carteira/i })).toBeVisible();

    await page.goto("/financial-agenda");
    await expect(page.getByRole("heading", { name: /Agenda/i })).toBeVisible();
    await page.getByRole("button", { name: "Nova conta" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel("Título")).toBeVisible();
    await page.getByLabel("Fechar").click();

    await page.goto("/reports?section=habits&report=where-money-goes");
    await expect(page.getByRole("heading", { name: /Relat/i })).toBeVisible();

    await page.goto("/support");
    await expect(page.getByRole("heading", { name: /Chat e Suporte|Consultor/i })).toBeVisible();

    await page.goto("/billing");
    await expect(page.getByRole("heading", { name: /Planos|Assinatura|Billing/i })).toBeVisible();
  });

  test("cliente registra movimento, agenda conta futura e encerra sessão", async ({ page }) => {
    test.skip(!allowE2eMutation, "Defina E2E_ALLOW_MUTATION=1 para criar dados no workspace de teste.");

    const marker = `E2E cliente ${Date.now()}`;
    const scheduledMarker = `Conta futura ${marker}`;

    await page.goto("/transactions/new");
    await page.getByLabel("Conta").selectOption({ index: 1 });
    await page.getByLabel("Descrição").fill(marker);
    await page.getByLabel("Valor").fill("12.34");
    await page.getByRole("button", { name: "Salvar lançamento" }).click();
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });

    await page.goto("/financial-agenda");
    await page.getByRole("button", { name: "Nova conta" }).click();
    await page.getByLabel("Título").fill(scheduledMarker);
    await page.getByLabel("Valor").fill("45.67");
    await page.getByLabel("Vencimento").fill(futureIsoDate(10));
    await page.getByRole("button", { name: "Criar compromisso" }).click();
    await expect(page.getByText(scheduledMarker)).toBeVisible({ timeout: 20_000 });

    await page.getByLabel("Sair da conta").click();
    await expect(page).toHaveURL(/\/login/);
  });
});
