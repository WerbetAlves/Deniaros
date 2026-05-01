import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { getWorkspaceContext } from "@/lib/workspace-context";

export default async function BackupSettingsPage() {
  const { user } = await getWorkspaceContext();

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page settings-workspace">
        <div className="module-hero panel settings-hero">
          <div>
            <p className="section-label">Segurança</p>
            <h2>Backup e restauração</h2>
            <p className="supporting-copy">
              Exporte uma cópia completa do workspace antes de testes com clientes, mudanças
              sensíveis ou ajustes de dados. A restauração assistida entra na próxima rodada.
            </p>
          </div>
          <div className="profile-badges">
            <Link className="ghost-button" href="/settings">
              Voltar
            </Link>
            <a className="primary-button" href="/api/export/workspace">
              Exportar agora
            </a>
          </div>
        </div>

        <section className="panel backup-readiness-panel">
          <div>
            <p className="section-label">Arquivo Deniaros</p>
            <h3>O que vai no backup?</h3>
            <p>
              O arquivo inclui contas, categorias, favorecidos, lançamentos, agenda financeira,
              planejadores, importações, conferências, tickets e preferências do usuário.
            </p>
          </div>
          <div className="backup-readiness-grid">
            <article>
              <strong>Antes de testar</strong>
              <p>Exporte o arquivo e guarde a cópia fora do navegador.</p>
            </article>
            <article>
              <strong>Depois de importar dados</strong>
              <p>Faça outro backup para preservar a versão validada pelo cliente.</p>
            </article>
            <article>
              <strong>Restauração</strong>
              <p>Por enquanto será assistida; a restauração automática fica bloqueada por segurança.</p>
            </article>
          </div>
        </section>

        <section className="panel backup-danger-panel">
          <div>
            <p className="section-label">Zona sensível</p>
            <h3>Apagar dados do sistema</h3>
            <p>
              Essa ação ainda não está liberada no produto. Quando entrar, exigirá confirmação
              explícita, backup recente e registro de auditoria.
            </p>
          </div>
          <button className="ghost-button danger-button" disabled type="button">
            Bloqueado por segurança
          </button>
        </section>
      </section>
    </AppShell>
  );
}
