import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getAdminAccess } from "@/lib/admin-auth";
import { getAdminRoleLabel } from "@/lib/admin-permissions";
import { getPrivacyPreferences } from "@/lib/privacy";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  requestDataDeletion,
  signOutEverywhere,
  signOutOtherSessions,
  updatePrivacyPreferences
} from "./actions";

type PrivacySearchParams = {
  error?: string;
  success?: string;
};

type DataAccessEventRow = {
  access_reason: string;
  access_scope: string;
  actor_role: string;
  created_at: string;
  id: string;
  metadata: Record<string, unknown>;
};

const accessMatrix = [
  {
    label: "Voce",
    permission: "Acesso completo",
    detail: "Pode ver, exportar, solicitar exclusao e controlar consentimentos."
  },
  {
    label: "IA do Deniaros",
    permission: "Somente com consentimento",
    detail: "Usa sintese financeira apenas quando a permissao global e o toggle da conversa estiverem ativos."
  },
  {
    label: "Suporte",
    permission: "Operacional",
    detail: "Ve tickets e contexto enviado por voce. Dados financeiros completos ficam fora do papel de suporte."
  },
  {
    label: "Financeiro",
    permission: "Cobranca",
    detail: "Ve assinatura e pagamentos. Nao deve acessar lancamentos, saldos ou categorias sensiveis."
  },
  {
    label: "Admin/Founder",
    permission: "Auditoria e excecao",
    detail: "Pode revisar dados financeiros sensiveis para operacao critica, sempre com trilha de auditoria."
  }
];

const scopeLabels: Record<string, string> = {
  admin_financial_review: "Revisao financeira administrativa",
  admin_operational_review: "Revisao operacional",
  backup_export: "Exportacao de backup",
  backup_restore: "Restauracao de backup",
  delete_request: "Pedido de exclusao",
  financial_context_ai: "Contexto financeiro da IA",
  privacy_settings: "Ajuste de privacidade",
  system_data_delete: "Apagamento de dados do sistema",
  support_review: "Revisao de suporte"
};

export default async function PrivacySettingsPage({
  searchParams
}: {
  searchParams: Promise<PrivacySearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const params = await searchParams;
  const preferences = await getPrivacyPreferences(supabase, user.id, workspaceId);
  const adminAccess = await getAdminAccess(supabase, user);
  const { data: sessionData } = await supabase.auth.getSession();
  const authState = await getAdvancedAuthState(supabase);
  const { data: accessEvents } = await supabase
    .from("data_access_events")
    .select("id,actor_role,access_scope,access_reason,metadata,created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(12)
    .returns<DataAccessEventRow[]>();

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page settings-workspace">
        <div className="module-hero panel settings-hero">
          <div>
            <p className="section-label">LGPD e seguranca</p>
            <h2>Privacidade e acesso</h2>
            <p className="supporting-copy">
              Controle quem pode ver dados financeiros, quando a IA usa contexto real e como
              exportar ou solicitar exclusao dos dados do sistema.
            </p>
          </div>
          <div className="profile-badges">
            <Link className="ghost-button" href="/settings">
              Voltar
            </Link>
            <a className="primary-button" href="/api/export/workspace">
              Exportar dados
            </a>
          </div>
        </div>

        {params.success ? (
          <p className="form-success">{translateSuccess(params.success)}</p>
        ) : null}
        {params.error ? <p className="form-error">{translateError(params.error)}</p> : null}

        <section className="panel settings-command-panel">
          <div>
            <p className="section-label">Regra do arquivo financeiro</p>
            <h3>Dados financeiros sao sensiveis por padrao</h3>
            <p>
              O Deniaros separa operacao, cobranca, suporte e leitura financeira. A IA tambem
              precisa de consentimento explicito para usar saldos, agenda, categorias e movimentos.
            </p>
          </div>
          <div className="settings-command-actions">
            <Link className="primary-button" href="/assistant">
              Abrir IA
            </Link>
            <Link className="ghost-button" href="/settings/backup">
              Backup
            </Link>
          </div>
        </section>

        <section className="settings-grid" aria-label="Sessoes e autenticacao">
          <article className="panel settings-card access-card">
            <div className="settings-card-head">
              <span className="settings-area-dot security" />
              <span className="status-chip">Sessao atual</span>
            </div>
            <div>
              <p className="section-label">Login ativo</p>
              <h3>{user.email}</h3>
              <dl className="security-detail-list">
                <div>
                  <dt>Expira em</dt>
                  <dd>{sessionData.session?.expires_at ? formatUnixTime(sessionData.session.expires_at) : "Nao informado"}</dd>
                </div>
                <div>
                  <dt>Ultimo login</dt>
                  <dd>{user.last_sign_in_at ? formatDateTime(user.last_sign_in_at) : "Nao informado"}</dd>
                </div>
                <div>
                  <dt>ID do usuario</dt>
                  <dd>{user.id.slice(0, 8)}</dd>
                </div>
              </dl>
            </div>
            <div className="settings-card-footer">
              <form action={signOutOtherSessions}>
                <button className="ghost-button" type="submit">
                  Encerrar outras sessoes
                </button>
              </form>
            </div>
          </article>

          <article className="panel settings-card access-card">
            <div className="settings-card-head">
              <span className="settings-area-dot account" />
              <span className="status-chip">{authState.currentLevel.toUpperCase()}</span>
            </div>
            <div>
              <p className="section-label">Autenticacao avancada</p>
              <h3>{authState.mfaEnabled ? "MFA ativo" : "MFA nao configurado"}</h3>
              <dl className="security-detail-list">
                <div>
                  <dt>Nivel atual</dt>
                  <dd>{authState.currentLevel}</dd>
                </div>
                <div>
                  <dt>Proximo nivel</dt>
                  <dd>{authState.nextLevel}</dd>
                </div>
                <div>
                  <dt>Fatores verificados</dt>
                  <dd>{authState.verifiedFactors}</dd>
                </div>
              </dl>
            </div>
            <div className="settings-card-footer">
              <Link className="ghost-button" href="/reset-password">
                Alterar senha
              </Link>
            </div>
          </article>

          <article className="panel settings-card access-card">
            <div className="settings-card-head">
              <span className="settings-area-dot system" />
              <span className="status-chip">{user.app_metadata?.provider ?? "email"}</span>
            </div>
            <div>
              <p className="section-label">Provedores conectados</p>
              <h3>{getIdentityProviders(user).join(", ") || "E-mail"}</h3>
              <div className="security-provider-list">
                {getIdentityProviders(user).map((provider) => (
                  <span className="status-chip" key={provider}>
                    {provider}
                  </span>
                ))}
              </div>
            </div>
            <div className="settings-card-footer">
              <form action={signOutEverywhere}>
                <button className="ghost-button danger-button" type="submit">
                  Sair de todos os dispositivos
                </button>
              </form>
            </div>
          </article>
        </section>

        <section className="settings-grid" aria-label="Permissoes efetivas">
          <article className="panel settings-card">
            <div className="settings-card-head">
              <span className="settings-area-dot account" />
              <span className="status-chip">Owner</span>
            </div>
            <div>
              <p className="section-label">Workspace</p>
              <h3>Dono do arquivo</h3>
              <p>Este usuario controla backup, restauracao, exclusao, consentimentos e configuracoes do workspace.</p>
            </div>
          </article>

          <article className="panel settings-card">
            <div className="settings-card-head">
              <span className="settings-area-dot security" />
              <span className="status-chip">{adminAccess.allowed ? "Ativo" : "Nao"}</span>
            </div>
            <div>
              <p className="section-label">SaaS admin</p>
              <h3>{adminAccess.allowed ? getAdminRoleLabel(adminAccess.role) : "Sem papel administrativo"}</h3>
              <p>
                {adminAccess.allowed
                  ? "Pode acessar areas administrativas conforme papel registrado."
                  : "Conta sem permissao administrativa no SaaS."}
              </p>
            </div>
          </article>

          <article className="panel settings-card">
            <div className="settings-card-head">
              <span className="settings-area-dot finance" />
              <span className="status-chip">
                {preferences.allowAiFinancialContext ? "Permitido" : "Bloqueado"}
              </span>
            </div>
            <div>
              <p className="section-label">IA financeira</p>
              <h3>Contexto sensivel</h3>
              <p>
                {preferences.allowAiFinancialContext
                  ? "A IA pode usar sintese financeira quando a conversa tambem autorizar."
                  : "A IA nao recebe saldos, agenda ou movimentos reais enquanto este consentimento estiver desligado."}
              </p>
            </div>
          </article>
        </section>

        <section className="settings-grid" aria-label="Matriz de acesso aos dados">
          {accessMatrix.map((item) => (
            <article className="panel settings-card" key={item.label}>
              <div className="settings-card-head">
                <span className="settings-area-dot security" />
                <span className="status-chip">{item.permission}</span>
              </div>
              <div>
                <p className="section-label">Quem acessa</p>
                <h3>{item.label}</h3>
                <p>{item.detail}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="panel">
          <div className="section-heading-row">
            <div>
              <p className="section-label">Consentimentos</p>
              <h3>Preferencias de privacidade</h3>
            </div>
            <span className="status-chip">
              {preferences.privacyPolicyAcknowledgedAt ? "Politica aceita" : "Politica pendente"}
            </span>
          </div>

          <form action={updatePrivacyPreferences} className="settings-search-form">
            <label className="assistant-context-toggle">
              <input
                defaultChecked={preferences.allowAiFinancialContext}
                name="allowAiFinancialContext"
                type="checkbox"
              />
              <span>
                Permitir contexto financeiro no Consultor IA
                <small>
                  Quando ligado, a IA pode receber uma sintese de saldos, contas, agenda e
                  movimentos recentes. Cada conversa ainda tem controle proprio.
                </small>
              </span>
            </label>

            <label className="assistant-context-toggle">
              <input
                defaultChecked={preferences.allowProductAnalytics}
                name="allowProductAnalytics"
                type="checkbox"
              />
              <span>
                Permitir metricas de produto sem dados financeiros
                <small>
                  Ajuda a melhorar fluxo, performance e usabilidade sem expor valores,
                  favorecidos ou descricoes de lancamentos.
                </small>
              </span>
            </label>

            <label>
              Retencao de dados
              <select defaultValue={preferences.dataRetentionMode} name="dataRetentionMode">
                <option value="standard">Padrao: historico completo para previsao</option>
                <option value="minimal">Minima: reduzir dados auxiliares quando possivel</option>
              </select>
            </label>

            <label className="assistant-context-toggle">
              <input
                defaultChecked={Boolean(preferences.privacyPolicyAcknowledgedAt)}
                name="policyAcknowledged"
                type="checkbox"
              />
              <span>
                Li e entendi a politica de privacidade operacional
                <small>
                  O Deniaros usa seus dados para gerenciar sua conta, gerar previsao, suporte,
                  seguranca, cobranca e recursos que voce ativar.
                </small>
              </span>
            </label>

            <button className="primary-button" type="submit">
              Salvar privacidade
            </button>
          </form>
        </section>

        <section className="panel backup-readiness-panel">
          <div>
            <p className="section-label">Politica de privacidade</p>
            <h3>O contrato de dados em linguagem direta</h3>
            <p>
              Seus dados financeiros pertencem ao seu workspace. O Deniaros usa esses dados para
              saldo, previsao, relatorios, agenda, planejadores, suporte autorizado, seguranca e
              cobranca. Open Finance, IA e analises ampliadas devem ficar sob consentimento.
            </p>
          </div>
          <div className="backup-readiness-grid">
            <article>
              <strong>Finalidade</strong>
              <p>Organizar historico, projetar futuro e alertar riscos financeiros.</p>
            </article>
            <article>
              <strong>Exportacao</strong>
              <p>Voce pode baixar uma copia JSON do workspace a qualquer momento.</p>
            </article>
            <article>
              <strong>Exclusao</strong>
              <p>O pedido fica registrado e deve passar por confirmacao operacional.</p>
            </article>
          </div>
        </section>

        <section className="panel backup-danger-panel">
          <div>
            <p className="section-label">Direito de exclusao</p>
            <h3>Apagar dados do sistema</h3>
            <p>
              Essa solicitacao abre um pedido auditado. Antes da execucao definitiva, o Deniaros
              deve confirmar identidade, assinatura, backups e efeitos irreversiveis.
            </p>
            {preferences.deleteRequestStatus !== "none" ? (
              <p className="micro-copy">
                Status atual: {translateDeleteStatus(preferences.deleteRequestStatus)}
                {preferences.deleteRequestedAt ? ` em ${formatDateTime(preferences.deleteRequestedAt)}` : ""}.
              </p>
            ) : null}
          </div>
          <form action={requestDataDeletion} className="settings-danger-actions">
            <label>
              Digite APAGAR DADOS DO SISTEMA
              <input name="confirmation" placeholder="APAGAR DADOS DO SISTEMA" />
            </label>
            <button className="ghost-button danger-button" type="submit">
              Solicitar exclusao
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="section-heading-row">
            <div>
              <p className="section-label">Auditoria LGPD</p>
              <h3>Log de acesso aos dados</h3>
            </div>
            <span className="status-chip">{accessEvents?.length ?? 0} evento(s)</span>
          </div>

          <div className="activity-list">
            {accessEvents?.length ? (
              accessEvents.map((event) => (
                <article className="activity-row" key={event.id}>
                  <div>
                    <strong>{scopeLabels[event.access_scope] ?? event.access_scope}</strong>
                    <p>{event.access_reason}</p>
                  </div>
                  <span>
                    {event.actor_role} - {formatDateTime(event.created_at)}
                  </span>
                </article>
              ))
            ) : (
              <p className="micro-copy">
                Nenhum acesso sensivel registrado ainda. Exportacoes, consentimento da IA e
                pedidos de exclusao aparecerao aqui.
              </p>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function translateSuccess(success: string) {
  if (success === "preferences") {
    return "Preferencias de privacidade salvas.";
  }

  if (success === "deletion-requested") {
    return "Pedido de exclusao registrado para revisao segura.";
  }

  if (success === "other-sessions-signed-out") {
    return "Outras sessoes foram encerradas.";
  }

  return "Operacao concluida.";
}

function translateError(error: string) {
  if (error === "confirmation") {
    return "Confirmacao invalida. Digite exatamente APAGAR DADOS DO SISTEMA.";
  }

  return "Nao foi possivel concluir a operacao.";
}

function translateDeleteStatus(status: string) {
  const labels: Record<string, string> = {
    cancelled: "cancelado",
    completed: "concluido",
    none: "sem pedido",
    processing: "em processamento",
    requested: "solicitado"
  };

  return labels[status] ?? status;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatUnixTime(value: number) {
  return formatDateTime(new Date(value * 1000).toISOString());
}

function getIdentityProviders(user: { identities?: Array<{ provider?: string | null }> }) {
  const providers = user.identities
    ?.map((identity) => identity.provider)
    .filter((provider): provider is string => Boolean(provider)) ?? [];

  return [...new Set(providers.length ? providers : ["email"])];
}

async function getAdvancedAuthState(
  supabase: Awaited<ReturnType<typeof getWorkspaceContext>>["supabase"]
) {
  try {
    const [{ data: assurance }, { data: factors }] = await Promise.all([
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
      supabase.auth.mfa.listFactors()
    ]);
    const verifiedFactors = [
      ...(factors?.totp ?? []),
      ...(factors?.phone ?? [])
    ].filter((factor) => factor.status === "verified").length;

    return {
      currentLevel: assurance?.currentLevel ?? "aal1",
      mfaEnabled: verifiedFactors > 0,
      nextLevel: assurance?.nextLevel ?? "aal1",
      verifiedFactors
    };
  } catch {
    return {
      currentLevel: "aal1",
      mfaEnabled: false,
      nextLevel: "aal1",
      verifiedFactors: 0
    };
  }
}
