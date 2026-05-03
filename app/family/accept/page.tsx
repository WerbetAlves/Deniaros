import Link from "next/link";
import { acceptFamilyInvitation } from "@/app/settings/family/actions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AcceptSearchParams = {
  error?: string;
  token?: string;
};

type InvitationPreview = {
  expires_at: string;
  invited_email: string;
  role: "partner" | "contributor" | "viewer";
  status: string;
  workspaces?: { name: string } | { name: string }[] | null;
};

export default async function AcceptFamilyInvitationPage({
  searchParams
}: {
  searchParams: Promise<AcceptSearchParams>;
}) {
  const params = await searchParams;
  const token = String(params.token ?? "").trim();
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const invitation = token ? await getInvitationPreview(token) : null;
  const workspaceName = Array.isArray(invitation?.workspaces)
    ? invitation?.workspaces[0]?.name
    : invitation?.workspaces?.name;

  return (
    <main className="accept-family-shell">
      <section className="panel accept-family-card">
        <p className="section-label">Convite familiar Deniaros</p>
        <h1>{workspaceName ? `Entrar em ${workspaceName}` : "Convite familiar"}</h1>
        {params.error ? <p className="form-error">{params.error}</p> : null}
        {!token ? (
          <p className="supporting-copy">O link de convite esta incompleto. Peça um novo convite ao titular.</p>
        ) : null}
        {invitation ? (
          <div className="accept-family-summary">
            <span>Convidado: {invitation.invited_email}</span>
            <span>Permissao: {getRoleLabel(invitation.role)}</span>
            <span>Status: {translateStatus(invitation.status)}</span>
            <span>Expira em: {formatDate(invitation.expires_at)}</span>
          </div>
        ) : null}
        {user ? (
          <form action={acceptFamilyInvitation}>
            <input name="token" type="hidden" value={token} />
            <button className="primary-button" disabled={!token || invitation?.status !== "pending"} type="submit">
              Aceitar convite
            </button>
          </form>
        ) : (
          <div className="accept-family-actions">
            <Link className="primary-button" href="/login">
              Entrar para aceitar
            </Link>
            <p>Use exatamente o e-mail convidado para liberar o acesso ao workspace familiar.</p>
          </div>
        )}
      </section>
    </main>
  );
}

async function getInvitationPreview(token: string) {
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin
      .from("workspace_invitations")
      .select("invited_email,role,status,expires_at,workspaces(name)")
      .eq("token", token)
      .maybeSingle<InvitationPreview>();

    return data ?? null;
  } catch {
    return null;
  }
}

function getRoleLabel(role: InvitationPreview["role"]) {
  const labels: Record<InvitationPreview["role"], string> = {
    contributor: "Lancar e organizar dados",
    partner: "Parceiro financeiro",
    viewer: "Somente leitura"
  };
  return labels[role];
}

function translateStatus(status: string) {
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
