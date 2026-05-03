create or replace function public.is_saas_financial_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
    and admin_users.is_active = true
    and admin_users.role in ('founder', 'admin')
  );
$$;

grant execute on function public.is_saas_financial_admin() to authenticated;

drop policy if exists "Admins can read all accounts" on public.accounts;
drop policy if exists "Financial admins can read all accounts" on public.accounts;
create policy "Financial admins can read all accounts"
on public.accounts
for select
using (public.is_saas_financial_admin());

drop policy if exists "Admins can read all categories" on public.categories;
drop policy if exists "Financial admins can read all categories" on public.categories;
create policy "Financial admins can read all categories"
on public.categories
for select
using (public.is_saas_financial_admin());

drop policy if exists "Admins can read all payees" on public.payees;
drop policy if exists "Financial admins can read all payees" on public.payees;
create policy "Financial admins can read all payees"
on public.payees
for select
using (public.is_saas_financial_admin());

drop policy if exists "Admins can read all transactions" on public.transactions;
drop policy if exists "Financial admins can read all transactions" on public.transactions;
create policy "Financial admins can read all transactions"
on public.transactions
for select
using (public.is_saas_financial_admin());

drop policy if exists "Admins can read all scheduled items" on public.scheduled_items;
drop policy if exists "Financial admins can read all scheduled items" on public.scheduled_items;
create policy "Financial admins can read all scheduled items"
on public.scheduled_items
for select
using (public.is_saas_financial_admin());

drop policy if exists "Admins can read all import batches" on public.import_batches;
drop policy if exists "Financial admins can read all import batches" on public.import_batches;
create policy "Financial admins can read all import batches"
on public.import_batches
for select
using (public.is_saas_financial_admin());

drop policy if exists "Admins can read all transaction audit events" on public.transaction_audit_events;
drop policy if exists "Financial admins can read all transaction audit events" on public.transaction_audit_events;
create policy "Financial admins can read all transaction audit events"
on public.transaction_audit_events
for select
using (public.is_saas_financial_admin());

create table if not exists public.privacy_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  allow_ai_financial_context boolean not null default false,
  allow_product_analytics boolean not null default false,
  data_retention_mode text not null default 'standard',
  privacy_policy_acknowledged_at timestamptz,
  delete_requested_at timestamptz,
  delete_request_status text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint privacy_preferences_user_workspace_unique unique (user_id, workspace_id),
  constraint privacy_preferences_retention_check check (data_retention_mode in ('standard', 'minimal')),
  constraint privacy_preferences_delete_status_check check (
    delete_request_status in ('none', 'requested', 'processing', 'completed', 'cancelled')
  )
);

create table if not exists public.data_access_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text not null default 'owner',
  access_scope text not null,
  access_reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint data_access_events_actor_role_check check (
    actor_role in ('owner', 'member', 'admin', 'founder', 'support', 'billing', 'system')
  ),
  constraint data_access_events_scope_check check (
    access_scope in (
      'privacy_settings',
      'financial_context_ai',
      'backup_export',
      'delete_request',
      'support_review',
      'admin_financial_review',
      'admin_operational_review'
    )
  )
);

create index if not exists privacy_preferences_workspace_id_idx
on public.privacy_preferences(workspace_id);

create index if not exists data_access_events_workspace_id_idx
on public.data_access_events(workspace_id, created_at desc);

create index if not exists data_access_events_actor_id_idx
on public.data_access_events(actor_id, created_at desc);

alter table public.privacy_preferences enable row level security;
alter table public.data_access_events enable row level security;

grant select, insert, update on table public.privacy_preferences to authenticated;
grant select, insert on table public.data_access_events to authenticated;

drop policy if exists "Users can read own privacy preferences" on public.privacy_preferences;
create policy "Users can read own privacy preferences"
on public.privacy_preferences
for select
using (
  user_id = auth.uid()
  or public.is_saas_financial_admin()
);

drop policy if exists "Users can create own privacy preferences" on public.privacy_preferences;
create policy "Users can create own privacy preferences"
on public.privacy_preferences
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces
    where workspaces.id = privacy_preferences.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update own privacy preferences" on public.privacy_preferences;
create policy "Users can update own privacy preferences"
on public.privacy_preferences
for update
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces
    where workspaces.id = privacy_preferences.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces
    where workspaces.id = privacy_preferences.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "Users can read own data access events" on public.data_access_events;
create policy "Users can read own data access events"
on public.data_access_events
for select
using (
  public.is_saas_admin()
  or exists (
    select 1
    from public.workspaces
    where workspaces.id = data_access_events.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "Users can create own data access events" on public.data_access_events;
create policy "Users can create own data access events"
on public.data_access_events
for insert
with check (
  actor_id = auth.uid()
  and (
    public.is_saas_admin()
    or exists (
      select 1
      from public.workspaces
      where workspaces.id = data_access_events.workspace_id
      and workspaces.owner_id = auth.uid()
    )
  )
);
