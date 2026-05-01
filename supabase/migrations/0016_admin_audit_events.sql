create table if not exists public.admin_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  workspace_id uuid references public.workspaces(id) on delete set null,
  target_type text not null,
  target_id text not null,
  action text not null,
  before_state jsonb,
  after_state jsonb,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint admin_audit_events_target_type_check check (
    target_type in ('subscription', 'feature_flag', 'support_ticket', 'admin_user', 'workspace')
  ),
  constraint admin_audit_events_action_check check (
    action in (
      'subscription_changed',
      'feature_flag_changed',
      'support_ticket_changed',
      'admin_access_changed',
      'workspace_reviewed'
    )
  )
);

create index if not exists admin_audit_events_workspace_id_idx
on public.admin_audit_events(workspace_id, created_at desc);

create index if not exists admin_audit_events_actor_id_idx
on public.admin_audit_events(actor_id, created_at desc);

create index if not exists admin_audit_events_target_idx
on public.admin_audit_events(target_type, target_id, created_at desc);

alter table public.admin_audit_events enable row level security;
grant select, insert on table public.admin_audit_events to authenticated;

drop policy if exists "Admins can read admin audit events" on public.admin_audit_events;
create policy "Admins can read admin audit events"
on public.admin_audit_events
for select
using (public.is_saas_admin());

drop policy if exists "Admins can create admin audit events" on public.admin_audit_events;
create policy "Admins can create admin audit events"
on public.admin_audit_events
for insert
with check (public.is_saas_admin());
