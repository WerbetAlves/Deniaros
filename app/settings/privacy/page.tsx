import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getPrivacyPreferences } from "@/lib/privacy";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { requestDataDeletion, updatePrivacyPreferences } from "./actions";

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
  delete_request: "Pedido de exclusao",
  financial_context_ai: "Contexto financeiro da IA",
  privacy_settings: "Ajuste de privacidade",
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
