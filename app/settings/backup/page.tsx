import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { restoreWorkspaceBackup } from "@/app/settings/backup/actions";
import { getWorkspaceContext } from "@/lib/workspace-context";

type BackupSettingsSearchParams = {
  restore_error?: string;
  restore_success?: string;
};

export default async function BackupSettingsPage({
  searchParams
}: {
  searchParams: Promise<BackupSettingsSearchParams>;
}) {
  const { user } = await getWorkspaceContext();
  const params = await searchParams;

  return (
    <AppShell userEmail={user.email}>
      <section className="module-page settings-workspace">
        <div className="module-hero panel settings-hero">
          <div>
            <p className="section-label">Segurança</p>
            <h2>Backup e restauração</h2>
            <p className="supporting-copy">
              Exporte uma cópia completa do workspace e restaure automaticamente quando precisar
              voltar a um ponto confiável dos seus dados financeiros.
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

        {params.restore_error ? <p className="form-error">{params.restore_error}</p> : null}
        {params.restore_success ? <p className="form-success">{params.restore_success}</p> : null}

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
              <strong>Restauração automática</strong>
              <p>O Deniaros substitui os dados atuais pelo conteúdo do backup em uma operação transacional.</p>
            </article>
          </div>
        </section>

        <section className="panel backup-restore-panel">
          <div>
            <p className="section-label">Restauração automática</p>
            <h3>Restaurar workspace a partir de um backup</h3>
            <p>
              Use apenas arquivos exportados pelo Deniaros. A restauração substitui dados financeiros,
              agenda, planejadores, importações e conferências do workspace atual.
            </p>
          </div>

          <form action={restoreWorkspaceBackup} className="backup-restore-form">
            <label>
              Arquivo de backup (.json)
              <input accept="application/json,.json" name="backupFile" required type="file" />
            </label>
            <label>
              Confirmação
              <input
                autoComplete="off"
                name="confirmation"
                placeholder='Digite "RESTAURAR"'
                required
              />
            </label>
            <div className="backup-restore-summary">
              <strong>O que será restaurado</strong>
              <span>Contas, categorias, favorecidos, lançamentos, contas futuras, metas e orçamento.</span>
              <span>Assinatura, plano, logs administrativos e permissões SaaS não são restaurados.</span>
            </div>
            <div className="form-actions">
              <a className="ghost-button" href="/api/export/workspace">
                Fazer backup antes
              </a>
              <button className="primary-button danger-button" type="submit">
                Restaurar backup
              </button>
            </div>
          </form>
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
