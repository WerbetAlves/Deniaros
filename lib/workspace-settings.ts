export const countryOptions = [
  { id: "BR", label: "Brasil", suggestedTimeZone: "America/Fortaleza" },
  { id: "US", label: "Estados Unidos", suggestedTimeZone: "America/New_York" },
  { id: "PT", label: "Portugal", suggestedTimeZone: "Europe/Lisbon" },
  { id: "ES", label: "Espanha", suggestedTimeZone: "Europe/Madrid" },
  { id: "GB", label: "Reino Unido", suggestedTimeZone: "Europe/London" }
] as const;

export const timeZoneOptions = [
  { id: "America/Fortaleza", label: "Fortaleza, Recife, Brasilia" },
  { id: "America/Sao_Paulo", label: "Sao Paulo, Rio de Janeiro" },
  { id: "America/Manaus", label: "Manaus" },
  { id: "America/New_York", label: "Nova York" },
  { id: "America/Chicago", label: "Chicago" },
  { id: "America/Los_Angeles", label: "Los Angeles" },
  { id: "Europe/Lisbon", label: "Lisboa" },
  { id: "Europe/Madrid", label: "Madrid" },
  { id: "Europe/London", label: "Londres" }
] as const;

export const workspaceTypeOptions = [
  {
    id: "personal",
    label: "Pessoal",
    description: "Uma pessoa organizando contas, dividas, metas e previsao de caixa."
  },
  {
    id: "family",
    label: "Familia",
    description: "Duas ou mais pessoas olhando o mesmo plano financeiro consolidado."
  },
  {
    id: "business",
    label: "Negocio",
    description: "Uso separado para microempresa, projeto ou operacao financeira propria."
  }
] as const;

export type WorkspaceTypeId = (typeof workspaceTypeOptions)[number]["id"];

export function normalizeCountryCode(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "").trim().toUpperCase();
  return countryOptions.some((option) => option.id === raw) ? raw : "BR";
}

export function normalizeTimeZone(value: FormDataEntryValue | string | null) {
  const raw = String(value ?? "").trim();
  return timeZoneOptions.some((option) => option.id === raw) ? raw : "America/Fortaleza";
}

export function normalizeWorkspaceType(value: FormDataEntryValue | string | null): WorkspaceTypeId {
  const raw = String(value ?? "").trim();
  return workspaceTypeOptions.some((option) => option.id === raw)
    ? (raw as WorkspaceTypeId)
    : "personal";
}

export function normalizeWorkspaceName(value: FormDataEntryValue | string | null) {
  const name = String(value ?? "").trim().replace(/\s+/g, " ");
  return name.slice(0, 80);
}
