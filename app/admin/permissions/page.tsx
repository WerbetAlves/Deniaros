import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { upsertAdminUser } from "@/app/admin/actions";
import { getAdminAccess, type AdminRole } from "@/lib/admin-auth";
import { getAdminRoleLabel, hasAdminPermission } from "@/lib/admin-permissions";
import { getWorkspaceContext } from "@/lib/workspace-context";

type PermissionsSearchParams = {
  error?: string;
  success?: string;
};

type AdminUserRow = {
  created_at: string;
  created_by: string | null;
  is_active: boolean;
  role: AdminRole;
  user_id: string;
};

type ProfileRow = {
  display_name: string | null;
  user_id: string;
  username: string | null;
};

type AdminAuditEventRow = {
  action: string;
  actor_role: string | null;
  created_at: string;
  id: string;
  target_id: string;
  target_type: string;
};

const adminRoles: AdminRole[] = ["founder", "admin", "billing", "support"];

const roleDescriptions: Record<AdminRole, string> = {
  admin: "Opera assinaturas, flags e suporte sem gerenciar founders.",
  billing: "Cuida de planos, cobranças e status de assinatura.",
  founder: "Controle total do SaaS, inclusive permissões administrativas.",
  support: "Atende tickets, responde usuários e acompanha histórico."
};

export default async function AdminPermissionsPage({
  searchParams
}: {
  searchParams: Promise<PermissionsSearchParams>;
}) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const access = await getAdminAccess(supabase, user);
  const { error, success } = await searchParams;
  const canManageAdmins = hasAdminPermission(access.role, "manage_admins");
  const returnTo = "/admin/permissions";

  if (!access.allowed) {
    return (
      <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
        <section className="module-page admin-workspace">
          <section className="panel">
            <p className="section-label">Área privada</p>
            <h2>Acesso administrativo necessário</h2>
            <p className="supporting-copy">Seu usuário ainda não pode visualizar permissões.</p>
          </section>
        </section>
      </AppShell>
    );
  }

  const [adminUsersResult, auditResult] = await Promise.all([
    supabase
      .from("admin_users")
      .select("user_id,role,is_active,created_by,created_at")
      .order("created_at", { ascending: true })
      .returns<AdminUserRow[]>(),
    supabase
      .from("admin_audit_events")
      .select("id,target_id,target_type,action,actor_role,created_at")
      .eq("target_type", "admin_user")
      .order("created_at", { ascending: false })
      .limit(10)
      .returns<AdminAuditEventRow[]>()
  ]);

  const adminUsers = adminUsersResult.data ?? [];
  const profileIds = Array.from(
    new Set(adminUsers.flatMap((entry) => [entry.user_id, entry.created_by]).filter(Boolean))
  ) as string[];
  const profilesResult = profileIds.length
    ? await supabase
        .from("user_profiles")
        .select("user_id,display_name,username")
        .in("user_id", profileIds)
        .returns<ProfileRow[]>()
    : { data: [] as ProfileRow[], error: null };
  const profiles = profilesResult.data ?? [];
  const profileByUserId = new Map(profiles.map((profile) => [profile.user_id, profile]));
  const auditEvents = auditResult.data ?? [];
  const loadError = adminUsersResult.error || profilesResult.error || auditResult.error;
  const activeAdmins = adminUsers.filter((entry) => entry.is_active);
  const founderCount = activeAdmins.filter((entry) => entry.role === "founder").length;

  return (
    <AppShell user={user} userEmail={user.email} workspaceId={workspaceId}>
      <section className="module-page admin-workspace admin-permissions-page">
        <div className="admin-detail-hero panel">
          <div>
            <Link className="micro-copy admin-back-link" href="/admin">
              Voltar ao painel
            </Link>
            <p className="section-label">Centro de permissões</p>
            <h2>Quem pode operar o SaaS?</h2>
            <p className="supporting-copy">
              Controle founders, admins, financeiro e suporte. Alterações ficam auditadas e
              operações sensíveis exigem papel de founder.
            </p>
          </div>
          <div className="admin-detail-status">
            <span className="status-chip admin-role-chip">{getAdminRoleLabel(access.role)}</span>
            <strong>{activeAdmins.length}</strong>
            <span>admin(s) ativo(s)</span>
          </div>
        </div>

        {error ? <p className="form-error">{error}</p> : null}
        {success ? <p className="form-success">{success}</p> : null}

        {loadError ? (
          <section className="source-banner">
            <strong>Permissões parcialmente indisponíveis</strong>
            <span>Aplique a migration 0021_admin_permissions_founder_policy.sql para reforçar a RLS.</span>
          </section>
        ) : null}

        {!canManageAdmins ? (
          <section className="source-banner">
            <strong>Somente leitura</strong>
            <span>Apenas founders podem criar, desativar ou alterar papéis administrativos.</span>
          </section>
        ) : null}

        <section className="admin-permission-role-grid">
          {adminRoles.map((role) => (
            <article className="panel admin-permission-role-card" key={role}>
              <p className="section-label">{getAdminRoleLabel(role)}</p>
              <strong>{activeAdmins.filter((entry) => entry.role === role).length}</strong>
              <p>{roleDescriptions[role]}</p>
            </article>
          ))}
        </section>

        <div className="admin-detail-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Novo acesso</p>
                <h3>Adicionar ou atualizar admin</h3>
              </div>
              <span className="status-chip">{founderCount} founder(s)</span>
            </div>
            <form action={upsertAdminUser} className="entity-form compact-form">
              <input name="returnTo" type="hidden" value={returnTo} />
              <label className="wide-field">
                ID do usuário
                <input
                  disabled={!canManageAdmins}
                  name="userId"
                  placeholder="UUID do usuário no Supabase Auth"
                  required
                />
              </label>
              <label>
                Papel
                <select defaultValue="support" disabled={!canManageAdmins} name="role">
                  {adminRoles.map((role) => (
                    <option key={role} value={role}>
                      {getAdminRoleLabel(role)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="checkbox-row">
                <span>Acesso ativo</span>
                <input defaultChecked disabled={!canManageAdmins} name="isActive" type="checkbox" />
              </label>
              <p className="micro-copy wide-field">
                Use o UID do usuário autenticado. Para encontrar esse ID, abra Authentication &gt;
                Users no Supabase.
              </p>
              <div className="form-actions">
                {canManageAdmins ? (
                  <button className="primary-button" type="submit">
                    Salvar permissão
                  </button>
                ) : (
                  <span className="status-chip status-muted">Somente founder</span>
                )}
              </div>
            </form>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <p className="section-label">Matriz</p>
                <h3>O que cada papel pode fazer</h3>
              </div>
            </div>
            <div className="admin-permission-matrix">
              <PermissionRow label="Assinantes e planos" roles={["founder", "admin", "billing"]} />
              <PermissionRow label="Feature flags" roles={["founder", "admin"]} />
              <PermissionRow label="Tickets e suporte" roles={["founder", "admin", "support"]} />
              <PermissionRow label="Permissões administrativas" roles={["founder"]} />
              <PermissionRow label="Leitura do Admin SaaS" roles={["founder", "admin", "billing", "support"]} />
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Equipe administrativa</p>
              <h3>Acessos ativos e suspensos</h3>
            </div>
            <span className="status-chip">{adminUsers.length} registro(s)</span>
          </div>
          <div className="admin-permission-user-list">
            {adminUsers.length ? (
              adminUsers.map((adminUser) => {
                const profile = profileByUserId.get(adminUser.user_id);
                const creator = adminUser.created_by ? profileByUserId.get(adminUser.created_by) : null;
                const isSelf = adminUser.user_id === user.id;

                return (
                  <article className="admin-permission-user-card" key={adminUser.user_id}>
                    <div>
                      <strong>{profile?.display_name ?? profile?.username ?? adminUser.user_id}</strong>
                      <p className="micro-copy">
                        {adminUser.user_id} · criado por{" "}
                        {creator?.display_name ?? creator?.username ?? adminUser.created_by ?? "sistema"} ·{" "}
                        {formatDate(adminUser.created_at)}
                      </p>
                    </div>
                    <form action={upsertAdminUser} className="admin-permission-inline-form">
                      <input name="returnTo" type="hidden" value={returnTo} />
                      <input name="userId" type="hidden" value={adminUser.user_id} />
                      <select
                        defaultValue={adminUser.role}
                        disabled={!canManageAdmins || isSelf}
                        name="role"
                      >
                        {adminRoles.map((role) => (
                          <option key={role} value={role}>
                            {getAdminRoleLabel(role)}
                          </option>
                        ))}
                      </select>
                      <label className="checkbox-row">
                        <span>Ativo</span>
                        <input
                          defaultChecked={adminUser.is_active}
                          disabled={!canManageAdmins || isSelf}
                          name="isActive"
                          type="checkbox"
                        />
                      </label>
                      {canManageAdmins && !isSelf ? (
                        <button className="primary-button" type="submit">
                          Atualizar
                        </button>
                      ) : (
                        <span className="status-chip status-muted">{isSelf ? "Seu acesso" : "Somente leitura"}</span>
                      )}
                    </form>
                  </article>
                );
              })
            ) : (
              <article className="empty-state">
                <strong>Nenhum admin encontrado.</strong>
                <p>Cadastre o primeiro founder diretamente no Supabase para iniciar o centro.</p>
              </article>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="section-label">Auditoria</p>
              <h3>Últimas mudanças de permissão</h3>
            </div>
            <span className="status-chip">{auditEvents.length} evento(s)</span>
          </div>
          <div className="admin-timeline-list compact">
            {auditEvents.length ? (
              auditEvents.map((event) => (
                <article key={event.id}>
                  <span>{formatDate(event.created_at)}</span>
                  <div>
                    <strong>{translateAdminAuditAction(event.action)}</strong>
                    <p className="micro-copy">
                      {event.actor_role ?? "admin"} · {event.target_id}
                    </p>
                  </div>
                </article>
              ))
            ) : (
              <article className="empty-state">
                <strong>Nenhuma mudança registrada.</strong>
                <p>Alterações feitas por este centro aparecerão aqui.</p>
              </article>
            )}
          </div>
        </section>
      </section>
    </AppShell>
  );
}

function PermissionRow({ label, roles }: { label: string; roles: AdminRole[] }) {
  return (
    <article>
      <strong>{label}</strong>
      <div>
        {adminRoles.map((role) => (
          <span className={roles.includes(role) ? "allowed" : ""} key={role}>
            {getAdminRoleLabel(role)}
          </span>
        ))}
      </div>
    </article>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

function translateAdminAuditAction(action: string) {
  const labels: Record<string, string> = {
    admin_access_changed: "Acesso administrativo alterado"
  };
  return labels[action] ?? action;
}
