import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { FinancialAssistantChat } from "@/components/financial-assistant-chat";
import { getPrivacyPreferences } from "@/lib/privacy";
import { getWorkspaceContext } from "@/lib/workspace-context";

export default async function AssistantPage({
  searchParams
}: {
  searchParams: Promise<{ question?: string }>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY?.trim());
  const params = await searchParams;
  const initialQuestion = String(params.question ?? "").trim();
  const privacyPreferences = await getPrivacyPreferences(supabase, user.id, workspaceId);

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page assistant-workspace">
        <div className="module-hero panel assistant-hero">
          <div>
            <p className="section-label">Consultor financeiro IA</p>
            <h2>Converse com seu Deniaros</h2>
            <p className="supporting-copy">
              Este é o espaço para uma conversa natural sobre sua vida financeira,
              sem abrir ticket e sem parecer atendimento em funil.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">{hasGeminiKey ? "Gemini conectado" : "Fallback ativo"}</span>
            <span className="status-chip">Contexto controlado</span>
          </div>
        </div>

        <div className="assistant-layout">
          <FinancialAssistantChat
            hasGeminiKey={hasGeminiKey}
            initialAllowFinancialContext={privacyPreferences.allowAiFinancialContext}
            initialQuestion={initialQuestion}
          />

          <aside className="assistant-side-panel">
            <section className="panel assistant-guidance-card">
              <p className="section-label">Como usar</p>
              <h3>Fale sem montar formulário</h3>
              <p>
                Pergunte como se estivesse conversando com alguém que conhece seu arquivo:
                “o que está apertando meu caixa?”, “onde estou gastando mais?” ou
                “o que eu faço primeiro hoje?”.
              </p>
            </section>

            <section className="panel assistant-guidance-card">
              <p className="section-label">Privacidade</p>
              <h3>Você controla o contexto</h3>
              <Link className="ghost-button" href="/settings/privacy">
                Ajustar privacidade
              </Link>
              <p>
                O chat usa contexto financeiro apenas com consentimento global ativo em
                Privacidade e com o controle da conversa ligado.
              </p>
            </section>

            <section className="panel assistant-guidance-card">
              <p className="section-label">Atalhos</p>
              <div className="assistant-link-stack">
                <Link className="ghost-button" href="/financial-agenda">
                  Ver agenda financeira
                </Link>
                <Link className="ghost-button" href="/decisions">
                  Abrir Centro de Decisoes
                </Link>
                <Link className="ghost-button" href="/planner?view=debts">
                  Revisar plano de dividas
                </Link>
                <Link className="ghost-button" href="/reports">
                  Abrir relatórios
                </Link>
                <Link className="ghost-button" href="/support">
                  Ir para suporte
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
