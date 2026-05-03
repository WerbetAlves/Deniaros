import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { formatCurrency } from "@/lib/finance";
import { getAppUrl } from "@/lib/stripe";
import { getWorkspaceContext } from "@/lib/workspace-context";
import {
  cancelFamilyInvitation,
  createFamilyInvitation,
  removeFamilyMember,
  updateFamilyMemberRole
} from "./actions";

type FamilySearchParams = {
  error?: string;
  invite?: string;
  success?: string;
};

type WorkspaceRow = {
  created_at: string;
  id: string;
  name: string;
  owner_id: string;
  type: "personal" | "family" | "business";
};

type SubscriptionRow = {
  plan_id: string;
  seats: number;
  status: string;
};

type MemberRow = {
  accepted_at: string | null;
  display_name: string | null;
  email: string;
  id: string;
  permissions: Record<string, unknown>;
  role: "partner" | "contributor" | "viewer";
  status: string;
  user_id: string;
};

type InvitationRow = {
  created_at: string;
  expires_at: string;
  id: string;
  invited_email: string;
  role: "partner" | "contributor" | "viewer";
  status: string;
  token: string;
};

type AccountRow = {
  opening_balance: number | string;
};

type TransactionRow = {
  amount: number | string;
  status: string;
  transfer_account_id: string | null;
};

type ScheduledRow = {
  amount: number | string;
  kind: "bill" | "deposit" | "saving";
  status: string;
};

export default async function FamilySettingsPage({
  searchParams
}: {
  searchParams: Promise<FamilySearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12, 0, 0)
    .toISOString()
    .slice(0, 10);
  const [
    workspaceResult,
    subscriptionResult,
    membersResult,
    invitationsResult,
    accountsResult,
    transactionsResult,
    scheduledResult
  ] = await Promise.all([
    supabase
      .from("workspaces")
      .select("id,owner_id,name,type,created_at")
      .eq("id", workspaceId)
      .maybeSingle<WorkspaceRow>(),
    supabase
      .from("saas_subscriptions")
      .select("plan_id,status,seats")
      .eq("workspace_id", workspaceId)
      .maybeSingle<SubscriptionRow>(),
    supabase
      .from("workspace_members")
      .select("id,user_id,email,display_name,role,permissions,status,accepted_at")
      .eq("workspace_id", workspaceId)
      .neq("status", "removed")
      .order("created_at", { ascending: true })
      .returns<MemberRow[]>(),
    supabase
      .from("workspace_invitations")
      .select("id,invited_email,role,status,token,expires_at,created_at")
      .eq("workspace_id", workspaceId)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<InvitationRow[]>(),
    supabase
      .from("accounts")
      .select("opening_balance")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true)
      .returns<AccountRow[]>(),
    supabase
      .from("transactions")
      .select("amount,status,transfer_account_id")
      .eq("workspace_id", workspaceId)
      .gte("occurred_on", monthStart)
      .lte("occurred_on", today)
      .returns<TransactionRow[]>(),
    supabase
      .from("scheduled_items")
      .select("amount,kind,status")
      .eq("workspace_id", workspaceId)
      .neq("status", "paid")
      .gte("due_on", today)
      .returns<ScheduledRow[]>()
  ]);
  const workspace = workspaceResult.data;
  const subscription = subscriptionResult.data;
  const members = membersResult.data ?? [];
  const invitations = invitationsResult.data ?? [];
  const pendingInvitations = invitations.filter((invitation) => invitation.status === "pending");
  const isOwner = workspace?.owner_id === user.id;
  const seatLimit = subscription?.seats ?? 1;
  const usedSeats = 1 + members.filter((member) => member.status === "active").length;
  const reservedSeats = usedSeats + pendingInvitations.length;
  const seatLabel = `${usedSeats}/${seatLimit}`;
  const invitationLink = params.invite
    ? `${getAppUrl()}/family/accept?token=${encodeURIComponent(params.invite)}`
    : null;
  const consolidated = summarizeConsolidated({
    accounts: accountsResult.data ?? [],
    scheduled: scheduledResult.data ?? [],
    transactions: transactionsResult.data ?? []
  });

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page settings-workspace family-workspace">
        <div className="module-hero panel settings-hero family-hero">
          <div>
            <p className="section-label">Plano Familia</p>
            <h2>Conta familiar com visao consolidada</h2>
            <p className="supporting-copy">
              Convide uma pessoa de confianca para gerenciar o mesmo arquivo financeiro com permissoes claras,
              Open Finance individual quando liberado e leitura consolidada do casal ou familia.
            </p>
          </div>
          <div className="profile-badges">
            <span className="status-chip">{seatLabel} assentos ativos</span>
            <span className="status-chip">{subscription?.plan_id === "family" ? "Plano Familia" : "Requer Familia"}</span>
          </div>
        </div>

        {params.error ? <p className="form-error">{params.error}</p> : null}
        {params.success ? <p className="form-success">{params.success}</p> : null}
        {invitationLink ? (
          <section className="source-banner family-invite-link">
            <strong>Link do convite criado</strong>
            <span>{invitationLink}</span>
          </section>
        ) : null}

        <section className="settings-grid family-summary-grid" aria-label="Resumo familiar">
          <article className="panel settings-card family-metric-card">
            <p className="section-label">Saldo consolidado</p>
            <strong>{formatCurrency(consolidated.balance, "BRL", "pt-BR")}</strong>
            <p>Contas ativas do workspace familiar.</p>
          </article>
          <article className="panel settings-card family-metric-card">
            <p className="section-label">Mes atual</p>
            <strong>{formatCurrency(consolidated.monthNet, "BRL", "pt-BR")}</strong>
            <p>Entradas menos saidas lancadas no periodo.</p>
          </article>
          <article className="panel settings-card family-metric-card">
            <p className="section-label">Agenda futura</p>
            <strong>{formatCurrency(consolidated.scheduledNet, "BRL", "pt-BR")}</strong>
            <p>Depositos previstos menos contas em aberto.</p>
          </article>
        </section>

        <section className="family-layout">
          <article className="panel family-panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Membro adicional</p>
                <h3>Convite familiar</h3>
              </div>
              <span className="status-chip">{Math.max(seatLimit - reservedSeats, 0)} livre(s)</span>
            </div>
            {isOwner ? (
              <form action={createFamilyInvitation} className="settings-form-grid family-invite-form">
                <label>
                  E-mail do membro
                  <input name="email" placeholder="ex.: esposa@email.com" type="email" />
                </label>
                <label>
                  Permissao
                  <select defaultValue="partner" name="role">
                    <option value="partner">Parceiro financeiro</option>
                    <option value="contributor">Lancar e organizar</option>
                    <option value="viewer">Somente leitura</option>
                  </select>
                </label>
                <button className="primary-button" disabled={seatLimit - reservedSeats <= 0} type="submit">
                  Criar convite
                </button>
              </form>
            ) : (
              <p className="supporting-copy">
                Somente o titular do workspace pode convidar, trocar permissoes ou remover membros.
              </p>
            )}
          </article>

          <article className="panel family-panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Permissoes</p>
                <h3>Acessos do workspace</h3>
              </div>
              <span className="status-chip">{members.length + 1} pessoa(s)</span>
            </div>
            <div className="family-member-list">
              <div className="family-member-row">
                <div>
                  <strong>{isOwner ? user.email : "Titular do workspace"}</strong>
                  <span>{isOwner ? "Titular do arquivo financeiro" : "Dono do arquivo compartilhado"}</span>
                </div>
                <span className="status-chip">Dono</span>
              </div>
              {members.map((member) => (
                <div className="family-member-row" key={member.id}>
                  <div>
                    <strong>{member.display_name || member.email}</strong>
                    <span>{member.email} - {getRoleLabel(member.role)}</span>
                  </div>
                  {isOwner ? (
                    <div className="family-row-actions">
                      <form action={updateFamilyMemberRole}>
                        <input name="memberId" type="hidden" value={member.id} />
                        <select defaultValue={member.role} name="role">
                          <option value="partner">Parceiro</option>
                          <option value="contributor">Lancador</option>
                          <option value="viewer">Leitura</option>
                        </select>
                        <button className="ghost-button" type="submit">
                          Salvar
                        </button>
                      </form>
                      <form action={removeFamilyMember}>
                        <input name="memberId" type="hidden" value={member.id} />
                        <button className="ghost-button danger-button" type="submit">
                          Remover
                        </button>
                      </form>
                    </div>
                  ) : (
                    <span className="status-chip">{member.status}</span>
                  )}
                </div>
              ))}
            </div>
          </article>
        </section>

        <section className="panel family-panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Convites recentes</p>
              <h3>Entrada controlada</h3>
            </div>
            <Link className="ghost-button" href="/billing">
              Ver assinatura
            </Link>
          </div>
          <div className="family-invitation-list">
            {invitations.length ? (
              invitations.map((invitation) => (
                <div className="family-member-row" key={invitation.id}>
                  <div>
                    <strong>{invitation.invited_email}</strong>
                    <span>
                      {getRoleLabel(invitation.role)} - expira em {formatDate(invitation.expires_at)}
                    </span>
                  </div>
                  <div className="family-row-actions">
                    <span className="status-chip">{translateInvitationStatus(invitation.status)}</span>
                    {isOwner && invitation.status === "pending" ? (
                      <form action={cancelFamilyInvitation}>
                        <input name="invitationId" type="hidden" value={invitation.id} />
                        <button className="ghost-button danger-button" type="submit">
                          Cancelar
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              ))
            ) : (
              <p className="supporting-copy">Nenhum convite familiar criado ainda.</p>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function summarizeConsolidated({
  accounts,
  scheduled,
  transactions
}: {
  accounts: AccountRow[];
  scheduled: ScheduledRow[];
  transactions: TransactionRow[];
}) {
  const balance = accounts.reduce((total, account) => total + Number(account.opening_balance || 0), 0);
  const monthNet = transactions.reduce((total, transaction) => {
    if (transaction.status !== "posted" || transaction.transfer_account_id) {
      return total;
    }

    return total + Number(transaction.amount || 0);
  }, 0);
  const scheduledNet = scheduled.reduce((total, item) => {
    const amount = Math.abs(Number(item.amount || 0));
    return item.kind === "deposit" ? total + amount : total - amount;
  }, 0);

  return {
    balance,
    monthNet,
    scheduledNet
  };
}

function getRoleLabel(role: MemberRow["role"]) {
  const labels: Record<MemberRow["role"], string> = {
    contributor: "Pode lancar e organizar",
    partner: "Parceiro financeiro",
    viewer: "Somente leitura"
  };
  return labels[role];
}

function translateInvitationStatus(status: string) {
  const labels: Record<string, string> = {
    accepted: "Aceito",
    canceled: "Cancelado",
    expired: "Expirado",
    pending: "Pendente"
  };
  return labels[status] ?? status;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}
