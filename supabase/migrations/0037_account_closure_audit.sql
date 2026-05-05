create table if not exists public.account_closure_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  user_email text,
  workspace_id uuid,
  workspace_name text,
  subscription_snapshot jsonb,
  deletion_reason text,
  status text not null default 'completed',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint account_closure_audit_status_check check (
    status in ('requested', 'completed', 'blocked', 'failed')
  )
);

create index if not exists account_closure_audit_user_id_idx
on public.account_closure_audit(user_id, created_at desc);

create index if not exists account_closure_audit_workspace_id_idx
on public.account_closure_audit(workspace_id, created_at desc);

alter table public.account_closure_audit enable row level security;

grant select, insert on table public.account_closure_audit to authenticated;

drop policy if exists "Admins can read account closure audit" on public.account_closure_audit;
create policy "Admins can read account closure audit"
on public.account_closure_audit
for select
using (public.is_saas_admin());

drop policy if exists "Users can create own account closure audit" on public.account_closure_audit;
create policy "Users can create own account closure audit"
on public.account_closure_audit
for insert
with check (user_id = auth.uid());
