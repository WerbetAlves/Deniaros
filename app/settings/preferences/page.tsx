import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  currencyOptions,
  dateFormatOptions,
  getSystemPreferences,
  languageOptions,
  quickAddOptions
} from "@/lib/system-preferences";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { updateSystemPreferences } from "./actions";

type PreferencesSearchParams = {
  error?: string;
  success?: string;
};

type WorkspacePreferenceRow = {
  base_currency: string;
  locale: string;
};

export default async function SystemPreferencesPage({
  searchParams
}: {
  searchParams: Promise<PreferencesSearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const params = await searchParams;
  const preferences = await getSystemPreferences(supabase, user.id, workspaceId);
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("base_currency,locale")
    .eq("id", workspaceId)
    .maybeSingle<WorkspacePreferenceRow>();

  const currentLanguage = workspace?.locale || preferences.language;
  const currentCurrency = workspace?.base_currency || "BRL";

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page settings-workspace">
        <div className="module-hero panel settings-hero">
          <div>
            <p className="section-label">Sistema</p>
            <h2>Preferencias do sistema</h2>
            <p className="supporting-copy">
              Ajuste idioma, moeda, atalhos, notificacoes e comportamento padrao para trabalhar
              mais rapido sem quebrar a identidade classica do Deniaros.
            </p>
          </div>
          <div className="profile-badges">
            <Link className="ghost-button" href="/settings">
              Voltar
            </Link>
            <span className="status-chip">{currentCurrency}</span>
          </div>
        </div>

        {params.error ? <p className="form-error">{params.error}</p> : null}
        {params.success ? <p className="form-success">{params.success}</p> : null}

        <form action={updateSystemPreferences} className="system-preferences-form">
          <section className="panel settings-preference-panel">
            <div className="section-heading-row">
              <div>
                <p className="section-label">Idioma e moeda</p>
                <h3>Padrao de leitura do arquivo</h3>
              </div>
              <span className="status-chip">Afeta relatorios</span>
            </div>

            <div className="settings-preference-grid">
              <label>
                Idioma do sistema
                <select defaultValue={currentLanguage} name="language">
                  {languageOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Moeda base
                <select defaultValue={currentCurrency} name="baseCurrency">
                  {currencyOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.id} - {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Formato de data
                <select defaultValue={preferences.dateFormat} name="dateFormat">
                  {dateFormatOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Inicio da semana
                <select defaultValue={preferences.weekStartsOn} name="weekStartsOn">
                  <option value="monday">Segunda-feira</option>
                  <option value="sunday">Domingo</option>
                </select>
              </label>
            </div>
          </section>

          <section className="settings-preference-columns">
            <article className="panel settings-preference-panel">
              <div>
                <p className="section-label">Atalhos</p>
                <h3>Velocidade operacional</h3>
              </div>

              <div className="settings-toggle-stack">
                <PreferenceToggle
                  defaultChecked={preferences.keyboardShortcutsEnabled}
                  description="Permite usar atalhos do teclado nas telas operacionais."
                  name="keyboardShortcutsEnabled"
                  title="Atalhos de teclado"
                />
                <PreferenceToggle
                  defaultChecked={preferences.commandPaletteEnabled}
                  description="Prepara o sistema para abrir comandos rapidos por teclado."
                  name="commandPaletteEnabled"
                  title="Paleta de comandos"
                />
                <PreferenceToggle
                  defaultChecked={preferences.enterToSubmit}
                  description="Envia formularios rapidos com Enter quando o campo permitir."
                  name="enterToSubmit"
                  title="Enter como acao principal"
                />
              </div>

              <label>
                Botao rapido padrao
                <select defaultValue={preferences.quickAddDefault} name="quickAddDefault">
                  {quickAddOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </article>

            <article className="panel settings-preference-panel">
              <div>
                <p className="section-label">Notificacoes</p>
                <h3>Alertas que merecem atencao</h3>
              </div>

              <div className="settings-toggle-stack">
                <PreferenceToggle
                  defaultChecked={preferences.inAppNotificationsEnabled}
                  description="Mostra alertas no topo do sistema."
                  name="inAppNotificationsEnabled"
                  title="Notificacoes internas"
                />
                <PreferenceToggle
                  defaultChecked={preferences.emailNotificationsEnabled}
                  description="Reserva para avisos por e-mail quando o canal estiver ativo."
                  name="emailNotificationsEnabled"
                  title="Notificacoes por e-mail"
                />
                <PreferenceToggle
                  defaultChecked={preferences.dueBillAlertsEnabled}
                  description="Avisa contas vencidas ou proximas do vencimento."
                  name="dueBillAlertsEnabled"
                  title="Contas vencendo"
                />
                <PreferenceToggle
                  defaultChecked={preferences.lowBalanceAlertsEnabled}
                  description="Avisa risco de saldo baixo ou negativo."
                  name="lowBalanceAlertsEnabled"
                  title="Saldo em risco"
                />
                <PreferenceToggle
                  defaultChecked={preferences.budgetRiskAlertsEnabled}
                  description="Avisa quando categorias e margens sugerem aperto."
                  name="budgetRiskAlertsEnabled"
                  title="Risco de orcamento"
                />
                <PreferenceToggle
                  defaultChecked={preferences.weeklyDigestEnabled}
                  description="Resumo semanal quando a rotina de envio estiver habilitada."
                  name="weeklyDigestEnabled"
                  title="Resumo semanal"
                />
              </div>
            </article>
          </section>

          <section className="panel settings-preference-panel">
            <div className="section-heading-row">
              <div>
                <p className="section-label">Comportamento</p>
                <h3>Como o Deniaros deve reagir ao seu uso</h3>
              </div>
              <button className="primary-button" type="submit">
                Salvar preferencias
              </button>
            </div>

            <div className="settings-toggle-stack compact">
              <PreferenceToggle
                defaultChecked={preferences.autoCategorizeImports}
                description="Aplica regras existentes para limpar importacoes mais rapido."
                name="autoCategorizeImports"
                title="Classificar importacoes automaticamente"
              />
              <PreferenceToggle
                defaultChecked={preferences.compactNumbers}
                description="Mostra numeros longos de forma abreviada quando a tela pedir densidade."
                name="compactNumbers"
                title="Numeros compactos"
              />
            </div>
          </section>
        </form>
      </section>
    </AppShell>
  );
}

function PreferenceToggle({
  defaultChecked,
  description,
  name,
  title
}: {
  defaultChecked: boolean;
  description: string;
  name: string;
  title: string;
}) {
  return (
    <label className="assistant-context-toggle">
      <input defaultChecked={defaultChecked} name={name} type="checkbox" />
      <span>
        {title}
        <small>{description}</small>
      </span>
    </label>
  );
}
