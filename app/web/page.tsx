import { AppShell } from "@/components/app-shell";
import { getWorkspaceContext } from "@/lib/workspace-context";

export default async function WebWindowsPage() {
  const { user } = await getWorkspaceContext();

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page">
        <div className="module-hero panel">
          <div>
            <p className="section-label">Modulo 8</p>
            <h2>Web (Windows)</h2>
            <p className="supporting-copy">
              Espaço reservado para recursos exclusivos do programa Windows, incluindo integrações
              locais e automações nativas.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">Exclusivo Windows</span>
          </div>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Status</p>
              <h3>Canal preparado para versao desktop</h3>
            </div>
          </div>
          <p className="supporting-copy">
            Neste ambiente web, este modulo fica em modo informativo. Na versao instalada do
            Windows ele hospedara recursos especificos da plataforma.
          </p>
        </section>
      </section>
    </AppShell>
  );
}
