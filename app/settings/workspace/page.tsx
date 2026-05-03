import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  countryOptions,
  timeZoneOptions,
  workspaceTypeOptions
} from "@/lib/workspace-settings";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { updateWorkspaceSettings } from "./actions";

type WorkspaceSearchParams = {
  error?: string;
  success?: string;
};

type WorkspaceSettingsRow = {
  base_currency: string;
  country_code: string;
  created_at: string;
  id: string;
  locale: string;
  name: string;
  time_zone: string;
  type: "personal" | "family" | "business";
  updated_at: string;
};

export default async function WorkspaceSettingsPage({
  searchParams
}: {
  searchParams: Promise<WorkspaceSearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const params = await searchParams;
  const { data: workspace, error } = await supabase
    .from("workspaces")
    .select("id,name,type,base_currency,locale,time_zone,country_code,created_at,updated_at")
    .eq("id", workspaceId)
    .maybeSingle<WorkspaceSettingsRow>();

  if (error || !workspace) {
    return (
      <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
        <section className="module-page settings-workspace">
          <section className="panel empty-state">
            <strong>Workspace indisponivel.</strong>
            <p>{error?.message ?? "Nao foi possivel carregar o arquivo financeiro atual."}</p>
            <Link className="ghost-button" href="/settings">
              Voltar para configuracoes
            </Link>
          </section>
        </section>
      </AppShell>
    );
  }

  const selectedType = workspaceTypeOptions.find((option) => option.id === workspace.type);
  const selectedCountry = countryOptions.find((option) => option.id === workspace.country_code);

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page settings-workspace">
        <div className="module-hero panel settings-hero">
          <div>
            <p className="section-label">Arquivo financeiro</p>
            <h2>Workspace</h2>
            <p className="supporting-copy">
              Defina o nome do arquivo, pais, fuso horario e perfil de uso que orientam
              previsoes, calendario e organizacao do Deniaros.
            </p>
          </div>
          <div className="profile-badges">
            <Link className="ghost-button" href="/settings">
              Voltar
            </Link>
            <span className="status-chip">{workspace.base_currency}</span>
            <span className="status-chip">{selectedType?.label ?? workspace.type}</span>
          </div>
        </div>

        {params.error ? <p className="form-error">{params.error}</p> : null}
        {params.success ? <p className="form-success">{params.success}</p> : null}

        <section className="panel settings-command-panel">
          <div>
            <p className="section-label">Identidade do arquivo</p>
            <h3>{workspace.name}</h3>
            <p>
              Este e o arquivo financeiro ativo. Ele concentra contas, movimentos, agenda,
              planejadores e relatorios do usuario autenticado.
            </p>
          </div>
          <div className="settings-command-actions">
            <Link className="primary-button" href="/accounts">
              Ver carteiras
            </Link>
            <Link className="ghost-button" href="/settings/preferences">
              Preferencias
            </Link>
          </div>
        </section>

        <form action={updateWorkspaceSettings} className="system-preferences-form">
          <section className="panel settings-preference-panel">
            <div className="section-heading-row">
              <div>
                <p className="section-label">Dados principais</p>
                <h3>Como o Deniaros deve reconhecer este arquivo?</h3>
              </div>
              <button className="primary-button" type="submit">
                Salvar workspace
              </button>
            </div>

            <div className="settings-preference-grid">
              <label>
                Nome do arquivo financeiro
                <input
                  defaultValue={workspace.name}
                  maxLength={80}
                  minLength={3}
                  name="name"
                  placeholder="Meu Deniaros"
                  required
                />
              </label>

              <label>
                Perfil de uso
                <select defaultValue={workspace.type} name="type">
                  {workspaceTypeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Pais
                <select defaultValue={workspace.country_code} name="countryCode">
                  {countryOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.id} - {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Fuso horario
                <select defaultValue={workspace.time_zone} name="timeZone">
                  {timeZoneOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>
        </form>

        <section className="settings-preference-columns">
          <article className="panel settings-preference-panel">
            <div>
              <p className="section-label">Perfil de uso</p>
              <h3>{selectedType?.label ?? "Pessoal"}</h3>
              <p>{selectedType?.description}</p>
            </div>
            <div className="backup-restore-summary">
              <strong>O que isso influencia</strong>
              <span>Texto da experiencia, organizacao futura de membros e permissao de contas compartilhadas.</span>
              <span>O Plano Familia usara este perfil para consolidar visoes de duas pessoas no mesmo Deniaros.</span>
            </div>
          </article>

          <article className="panel settings-preference-panel">
            <div>
              <p className="section-label">Localidade</p>
              <h3>{selectedCountry?.label ?? workspace.country_code}</h3>
              <p>
                Fuso atual: {workspace.time_zone}. Idioma: {workspace.locale}. Moeda base:{" "}
                {workspace.base_currency}.
              </p>
            </div>
            <div className="backup-restore-summary">
              <strong>Leitura financeira</strong>
              <span>Pais e fuso ajudam calendario, vencimentos e rotina de alertas.</span>
              <span>Idioma e moeda ficam em Preferencias do sistema para manter uma fonte unica.</span>
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="section-heading-row">
            <div>
              <p className="section-label">Metadados</p>
              <h3>Estado do arquivo</h3>
            </div>
            <span className="status-chip">{workspace.id.slice(0, 8)}</span>
          </div>
          <div className="settings-preference-grid">
            <div className="backup-restore-summary">
              <strong>Criado em</strong>
              <span>{formatDateTime(workspace.created_at, workspace.locale)}</span>
            </div>
            <div className="backup-restore-summary">
              <strong>Ultima atualizacao</strong>
              <span>{formatDateTime(workspace.updated_at, workspace.locale)}</span>
            </div>
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale || "pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}
