import { expect, type Page, type TestInfo } from "@playwright/test";

export const e2eCredentials = {
  email: process.env.E2E_USER_EMAIL ?? "",
  password: process.env.E2E_USER_PASSWORD ?? ""
};

export const hasE2eCredentials = Boolean(e2eCredentials.email && e2eCredentials.password);
export const allowE2eMutation = process.env.E2E_ALLOW_MUTATION === "1";

export async function loginWithEmail(page: Page) {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await page.getByLabel("E-mail").fill(e2eCredentials.email);
  await page.locator('input[name="password"]').fill(e2eCredentials.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).not.toHaveURL(/\/login(?:\?|$)/, { timeout: 20_000 });
}

export function skipAuthenticatedFlowWhenNeeded(testInfo: TestInfo) {
  if (testInfo.project.name !== "chromium-desktop") {
    return "Fluxo autenticado completo roda no desktop para evitar duplicar mutacoes.";
  }

  if (!hasE2eCredentials) {
    return "Defina E2E_USER_EMAIL e E2E_USER_PASSWORD para rodar o fluxo autenticado real.";
  }

  return null;
}

export function futureIsoDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}
