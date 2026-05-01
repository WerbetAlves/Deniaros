import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getWorkspaceContext } from "@/lib/workspace-context";

export default async function DecisionsPage() {
  const { user } = await getWorkspaceContext();

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page">
        <div className="module-hero panel">
          <div>
            <p className="section-label">Modulo 7</p>
            <h2>Decisões</h2>
            <p className="supporting-copy">
              Centro consultivo para avaliar escolhas, priorizar movimentos e conectar inventário
              doméstico ao planejamento.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">Centro de decisões</span>
          </div>
        </div>

        <div className="module-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Inventário doméstico</p>
                <h3>Patrimônio de uso diário</h3>
              </div>
            </div>
            <p className="supporting-copy">
              Use o inventário para enriquecer análise de cobertura, ativos e prioridades de
              protecao.
            </p>
            <div className="form-actions planner-side-actions">
              <Link className="primary-button" href="/home-inventory">
                Abrir inventário doméstico
              </Link>
            </div>
          </section>

          <aside className="panel module-sidecard">
            <div className="panel-header">
              <div>
                <p className="section-label">Roadmap</p>
                <h3>Próximos blocos</h3>
              </div>
            </div>
            <ul className="module-list">
              <li>análise de cenários e impacto no caixa</li>
              <li>recomendações de prioridade com IA</li>
              <li>trilha de decisões com histórico</li>
            </ul>
          </aside>
        </div>
      </section>
    </AppShell>
  );
}
