import { expect, type Page, type TestInfo } from "@playwright/test";

export const e2eCredentials = {
  email: process.env.E2E_USER_EMAIL ?? "",
  password: process.env.E2E_USER_PASSWORD ?? ""
};
export const e2eCleanCredentials = {
  email: process.env.E2E_CLEAN_USER_EMAIL ?? "",
  password: process.env.E2E_CLEAN_USER_PASSWORD ?? ""
};

export const hasE2eCredentials = Boolean(e2eCredentials.email && e2eCredentials.password);
export const hasE2eCleanCredentials = Boolean(e2eCleanCredentials.email && e2eCleanCredentials.password);
export const allowE2eMutation = process.env.E2E_ALLOW_MUTATION === "1";

export async function loginWithEmail(page: Page, credentials = e2eCredentials) {
  await page.goto("/login");
  await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  await page.getByLabel("E-mail").fill(credentials.email);
  await page.locator('input[name="password"]').fill(credentials.password);
  await page.getByRole("button", { name: "Entrar" }).click();

  try {
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 20_000 });
  } catch {
    const visibleError = await page
      .locator(".auth-toast, .form-error, [role='alert']")
      .first()
      .textContent()
      .catch(() => null);

    throw new Error(
      `Login E2E não saiu da tela de login. Verifique E2E_USER_EMAIL, E2E_USER_PASSWORD e confirmação do usuário no Supabase.${visibleError ? ` Mensagem visível: ${visibleError.trim()}` : ""}`
    );
  }

  await dismissPersonalProfileGate(page);
}

export async function gotoAuthenticatedPage(page: Page, path: string) {
  await page.goto(path, { waitUntil: "domcontentloaded" });
  const dismissed = await dismissPersonalProfileGate(page);

  if (dismissed && !samePath(page, path)) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await dismissPersonalProfileGate(page);
  }
}

export async function dismissPersonalProfileGate(page: Page) {
  const skipButton = page.getByRole("button", { name: "Pular por enquanto" });
  const continueButton = page.getByRole("button", { name: /Continuar para minha primeira carteira/i });
  const isProfileGate = page.url().includes("/personal-profile");
  const hasSkipButton = await skipButton.isVisible().catch(() => false);
  const hasContinueButton = await continueButton.isVisible().catch(() => false);

  if (!isProfileGate && !hasSkipButton && !hasContinueButton) {
    return false;
  }

  if (hasContinueButton) {
    await continueButton.click();
  } else {
    await skipButton.click();
  }

  await expect(page).not.toHaveURL(/\/personal-profile(?:\?|$)/, { timeout: 15_000 });
  return true;
}

export function skipAuthenticatedFlowWhenNeeded(testInfo: TestInfo) {
  if (testInfo.project.name !== "chromium-desktop") {
    return "Fluxo autenticado completo roda no desktop para evitar duplicar mutações.";
  }

  if (!hasE2eCredentials) {
    return "Defina E2E_USER_EMAIL e E2E_USER_PASSWORD para rodar o fluxo autenticado real.";
  }

  if (isPlaceholderEmail(e2eCredentials.email)) {
    return "Troque E2E_USER_EMAIL por um usuário real de teste. O valor atual ainda parece placeholder.";
  }

  return null;
}

export function skipCleanAuthenticatedFlowWhenNeeded(testInfo: TestInfo) {
  const baseSkipReason = skipAuthenticatedFlowWhenNeeded(testInfo);

  if (baseSkipReason && !baseSkipReason.includes("E2E_USER_EMAIL")) {
    return baseSkipReason;
  }

  if (!hasE2eCleanCredentials) {
    return "Defina E2E_CLEAN_USER_EMAIL e E2E_CLEAN_USER_PASSWORD para rodar o fluxo de usuário limpo.";
  }

  if (!allowE2eMutation) {
    return "Defina E2E_ALLOW_MUTATION=1 para criar carteira e importar dados no usuário limpo.";
  }

  if (isPlaceholderEmail(e2eCleanCredentials.email)) {
    return "Troque E2E_CLEAN_USER_EMAIL por um usuário limpo real de teste.";
  }

  return null;
}

export function futureIsoDate(daysFromNow: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().slice(0, 10);
}

function samePath(page: Page, path: string) {
  const expectedPath = path.startsWith("/") ? path : `/${path}`;
  const current = new URL(page.url());
  return current.pathname === expectedPath.split("?")[0];
}

function isPlaceholderEmail(email: string) {
  return /@(exemplo\.com|example\.com|seudominio\.com)$/i.test(email);
}
