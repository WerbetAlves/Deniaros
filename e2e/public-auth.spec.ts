import { expect, test } from "@playwright/test";

test.describe("acesso publico e autenticacao", () => {
  test("rota protegida redireciona visitante para login", async ({ page }) => {
    await page.goto("/transactions/new");

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByLabel("E-mail")).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("login expõe cadastro, recuperação e Google sem quebrar responsividade", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("Deniaros").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar com Google" })).toBeVisible();

    await page.getByRole("link", { name: "Cadastre-se" }).click();
    await expect(page).toHaveURL(/mode=signup/);
    await expect(page.getByLabel("Nome")).toBeVisible();
    await expect(page.getByRole("button", { name: "Cadastrar" })).toBeVisible();

    await page.goto("/login");
    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await expect(page).toHaveURL(/mode=recovery/);
    await expect(page.getByRole("button", { name: "Enviar link de recuperação" })).toBeVisible();
  });
});
