import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getWorkspaceContext } from "@/lib/workspace-context";

export default async function InvestmentsPage() {
  const { user } = await getWorkspaceContext();

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page">
        <div className="module-hero panel">
          <div>
            <p className="section-label">Modulo 4</p>
            <h2>Investimentos</h2>
            <p className="supporting-copy">
              Acompanhe carteira de bolsa, evolucao de patrimônio e leitura de risco com foco em
              decisão.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">Em construção</span>
          </div>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Próximo entregável</p>
              <h3>Base de acompanhamento de ativos</h3>
            </div>
          </div>
          <ul className="module-list">
            <li>cadastro de ativos, corretoras e aportes</li>
            <li>painel de rentabilidade consolidada</li>
            <li>visão por classe de ativos e metas</li>
          </ul>
          <div className="form-actions planner-side-actions">
            <Link className="ghost-button" href="/reports">
              Ir para Relatórios
            </Link>
            <Link className="primary-button" href="/planner">
              Ir para Planejador
            </Link>
          </div>
        </section>
      </section>
    </AppShell>
  );
}
