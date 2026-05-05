import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import {
  deleteUserAccount,
  deleteWorkspaceSystemData,
  restoreWorkspaceBackup
} from "@/app/settings/backup/actions";
import { getWorkspaceContext } from "@/lib/workspace-context";

type BackupSettingsSearchParams = {
  account_error?: string;
  delete_error?: string;
  delete_success?: string;
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
            <p className="section-label">Seguranca</p>
            <h2>Backup e restauracao</h2>
            <p className="supporting-copy">
              Exporte uma copia completa do workspace, restaure pontos confiaveis e execute
              operacoes sensiveis com confirmacao forte e auditoria.
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
        {params.delete_error ? <p className="form-error">{params.delete_error}</p> : null}
        {params.delete_success ? <p className="form-success">{params.delete_success}</p> : null}
        {params.account_error ? <p className="form-error">{params.account_error}</p> : null}

        <section className="panel backup-readiness-panel">
          <div>
            <p className="section-label">Arquivo Deniaros</p>
            <h3>O que vai no backup?</h3>
            <p>
              O arquivo inclui contas, categorias, favorecidos, lancamentos, agenda financeira,
              planejadores, importacoes, conferencias, tickets e preferencias do usuario.
            </p>
          </div>
          <div className="backup-readiness-grid">
            <article>
              <strong>Antes de testar</strong>
              <p>Exporte o arquivo e guarde a copia fora do navegador.</p>
            </article>
            <article>
              <strong>Depois de importar dados</strong>
              <p>Faca outro backup para preservar a versao validada pelo cliente.</p>
            </article>
            <article>
              <strong>Restauracao automatica</strong>
              <p>O Deniaros substitui os dados atuais pelo backup em uma operacao transacional.</p>
            </article>
          </div>
        </section>

        <section className="panel backup-restore-panel">
          <div>
            <p className="section-label">Restauracao automatica</p>
            <h3>Restaurar workspace a partir de um backup</h3>
            <p>
              Use apenas arquivos exportados pelo Deniaros. A restauracao substitui dados
              financeiros, agenda, planejadores, importacoes e conferencias do workspace atual.
            </p>
          </div>

          <form action={restoreWorkspaceBackup} className="backup-restore-form">
            <label>
              Arquivo de backup (.json)
              <input accept="application/json,.json" name="backupFile" required type="file" />
            </label>
            <label>
              Confirmacao
              <input
                autoComplete="off"
                name="confirmation"
                placeholder='Digite "RESTAURAR"'
                required
              />
            </label>
            <div className="backup-restore-summary">
              <strong>O que sera restaurado</strong>
              <span>Contas, categorias, favorecidos, lancamentos, contas futuras, metas e orcamento.</span>
              <span>Assinatura, plano, logs administrativos e permissoes SaaS nao sao restaurados.</span>
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
            <p className="section-label">Zona sensivel</p>
            <h3>Apagar dados do sistema</h3>
            <p>
              Remove dados financeiros e operacionais do workspace atual, preservando conta,
              assinatura, permissoes SaaS, privacidade e trilha de auditoria. Use somente depois
              de exportar um backup.
            </p>
            <div className="backup-restore-summary danger-summary">
              <strong>O que sera apagado</strong>
              <span>Contas, categorias, favorecidos, lancamentos, agenda, metas, orcamentos, importacoes e tickets.</span>
              <span>Conta de login, assinatura, plano, permissoes SaaS e logs LGPD permanecem preservados.</span>
            </div>
          </div>

          <form action={deleteWorkspaceSystemData} className="backup-delete-form">
            <label>
              Primeira confirmacao
              <input
                autoComplete="off"
                name="primaryConfirmation"
                placeholder="APAGAR DADOS DO SISTEMA"
                required
              />
            </label>
            <label>
              Segunda confirmacao
              <input
                autoComplete="off"
                name="backupConfirmation"
                placeholder="CONFIRMO QUE TENHO BACKUP"
                required
              />
            </label>
            <div className="form-actions">
              <a className="ghost-button" href="/api/export/workspace">
                Exportar backup
              </a>
              <button className="primary-button danger-button" type="submit">
                Apagar dados do sistema
              </button>
            </div>
          </form>
        </section>

        <section className="panel backup-danger-panel" id="account-deletion">
          <div>
            <p className="section-label">Conta de login</p>
            <h3>Excluir minha conta Deniaros</h3>
            <p>
              Remove o usuario de login e encerra o workspace vinculado a esta conta. Esta acao
              e diferente de apagar dados do sistema: aqui a conta deixa de existir.
            </p>
            <div className="backup-restore-summary danger-summary">
              <strong>O que sera excluido</strong>
              <span>Conta de login, workspace, carteiras, lancamentos, agenda, preferencias e permissoes familiares.</span>
              <span>Se houver assinatura Stripe ativa, o Deniaros bloqueia a exclusao ate ela ser cancelada em Planos.</span>
              <span>Um registro minimo de auditoria fica preservado para seguranca operacional e LGPD.</span>
            </div>
          </div>

          <form action={deleteUserAccount} className="backup-delete-form">
            <label>
              Frase de exclusao
              <input
                autoComplete="off"
                name="accountConfirmation"
                placeholder="EXCLUIR MINHA CONTA"
                required
              />
            </label>
            <label>
              Confirmacao de backup
              <input
                autoComplete="off"
                name="backupConfirmation"
                placeholder="CONFIRMO QUE TENHO BACKUP"
                required
              />
            </label>
            <label>
              E-mail da conta
              <input
                autoComplete="off"
                name="emailConfirmation"
                placeholder={user.email ?? "seu e-mail de login"}
                required
                type="email"
              />
            </label>
            <div className="form-actions">
              <a className="ghost-button" href="/api/export/workspace">
                Exportar backup
              </a>
              <button className="primary-button danger-button" type="submit">
                Excluir minha conta
              </button>
            </div>
          </form>
        </section>
      </section>
    </AppShell>
  );
}
