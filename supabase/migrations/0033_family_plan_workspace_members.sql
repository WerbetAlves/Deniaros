alter table public.data_access_events
drop constraint if exists data_access_events_scope_check;

alter table public.data_access_events
add constraint data_access_events_scope_check check (
  access_scope in (
    'privacy_settings',
    'financial_context_ai',
    'backup_export',
    'backup_restore',
    'delete_request',
    'system_data_delete',
    'family_invite',
    'family_member_access',
    'support_review',
    'admin_financial_review',
    'admin_operational_review'
  )
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  email text not null,
  display_name text,
  role text not null default 'partner',
  permissions jsonb not null default '{"can_view_consolidated":true,"can_manage_finance":true,"can_manage_invites":false,"can_manage_open_finance":true}'::jsonb,
  status text not null default 'active',
  is_primary boolean not null default false,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_members_role_check check (role in ('partner', 'contributor', 'viewer')),
  constraint workspace_members_status_check check (status in ('active', 'suspended', 'removed')),
  constraint workspace_members_user_unique unique (workspace_id, user_id),
  constraint workspace_members_email_unique unique (workspace_id, email)
);

create table if not exists public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'partner',
  permissions jsonb not null default '{"can_view_consolidated":true,"can_manage_finance":true,"can_manage_invites":false,"can_manage_open_finance":true}'::jsonb,
  token text not null unique,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_invitations_role_check check (role in ('partner', 'contributor', 'viewer')),
  constraint workspace_invitations_status_check check (status in ('pending', 'accepted', 'canceled', 'expired'))
);

create index if not exists workspace_members_user_id_idx
on public.workspace_members(user_id, status);

create index if not exists workspace_members_workspace_id_idx
on public.workspace_members(workspace_id, status);

create index if not exists workspace_invitations_workspace_id_idx
on public.workspace_invitations(workspace_id, status);

create index if not exists workspace_invitations_email_idx
on public.workspace_invitations(lower(invited_email), status);

alter table public.workspace_members enable row level security;
alter table public.workspace_invitations enable row level security;

grant select, insert, update, delete on table public.workspace_members to authenticated;
grant select, insert, update, delete on table public.workspace_invitations to authenticated;

create or replace function public.is_active_workspace_member(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = target_workspace_id
    and workspace_members.user_id = auth.uid()
    and workspace_members.status = 'active'
  );
$$;

create or replace function public.can_manage_workspace_finance(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspaces
    where workspaces.id = target_workspace_id
    and workspaces.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = target_workspace_id
    and workspace_members.user_id = auth.uid()
    and workspace_members.status = 'active'
    and coalesce((workspace_members.permissions ->> 'can_manage_finance')::boolean, false) = true
  );
$$;

create or replace function public.can_manage_workspace_members(target_workspace_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.workspaces
    where workspaces.id = target_workspace_id
    and workspaces.owner_id = auth.uid()
  )
  or exists (
    select 1
    from public.workspace_members
    where workspace_members.workspace_id = target_workspace_id
    and workspace_members.user_id = auth.uid()
    and workspace_members.status = 'active'
    and coalesce((workspace_members.permissions ->> 'can_manage_invites')::boolean, false) = true
  );
$$;

grant execute on function public.is_active_workspace_member(uuid) to authenticated;
grant execute on function public.can_manage_workspace_finance(uuid) to authenticated;
grant execute on function public.can_manage_workspace_members(uuid) to authenticated;

drop policy if exists "Workspace members can read workspace" on public.workspaces;
create policy "Workspace members can read workspace"
on public.workspaces
for select
using (public.is_active_workspace_member(id));

drop policy if exists "Workspace members can read members" on public.workspace_members;
create policy "Workspace members can read members"
on public.workspace_members
for select
using (
  public.is_saas_admin()
  or user_id = auth.uid()
  or public.can_manage_workspace_members(workspace_id)
);

drop policy if exists "Workspace owners can manage members" on public.workspace_members;
create policy "Workspace owners can manage members"
on public.workspace_members
for all
using (public.can_manage_workspace_members(workspace_id) or public.is_saas_admin())
with check (public.can_manage_workspace_members(workspace_id) or public.is_saas_admin());

drop policy if exists "Workspace members can read invitations" on public.workspace_invitations;
create policy "Workspace members can read invitations"
on public.workspace_invitations
for select
using (
  public.is_saas_admin()
  or public.can_manage_workspace_members(workspace_id)
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Workspace owners can manage invitations" on public.workspace_invitations;
create policy "Workspace owners can manage invitations"
on public.workspace_invitations
for all
using (public.can_manage_workspace_members(workspace_id) or public.is_saas_admin())
with check (public.can_manage_workspace_members(workspace_id) or public.is_saas_admin());

drop policy if exists "Workspace members can read accounts" on public.accounts;
create policy "Workspace members can read accounts"
on public.accounts
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage accounts" on public.accounts;
create policy "Workspace members can manage accounts"
on public.accounts
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read categories" on public.categories;
create policy "Workspace members can read categories"
on public.categories
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage categories" on public.categories;
create policy "Workspace members can manage categories"
on public.categories
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read payees" on public.payees;
create policy "Workspace members can read payees"
on public.payees
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage payees" on public.payees;
create policy "Workspace members can manage payees"
on public.payees
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read transactions" on public.transactions;
create policy "Workspace members can read transactions"
on public.transactions
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage transactions" on public.transactions;
create policy "Workspace members can manage transactions"
on public.transactions
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read scheduled items" on public.scheduled_items;
create policy "Workspace members can read scheduled items"
on public.scheduled_items
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage scheduled items" on public.scheduled_items;
create policy "Workspace members can manage scheduled items"
on public.scheduled_items
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read exchange rates" on public.exchange_rates;
create policy "Workspace members can read exchange rates"
on public.exchange_rates
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage exchange rates" on public.exchange_rates;
create policy "Workspace members can manage exchange rates"
on public.exchange_rates
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read personal profiles" on public.personal_profiles;
create policy "Workspace members can read personal profiles"
on public.personal_profiles
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can read home inventory" on public.home_inventory_items;
create policy "Workspace members can read home inventory"
on public.home_inventory_items
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage home inventory" on public.home_inventory_items;
create policy "Workspace members can manage home inventory"
on public.home_inventory_items
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read tax categories" on public.tax_categories;
create policy "Workspace members can read tax categories"
on public.tax_categories
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage tax categories" on public.tax_categories;
create policy "Workspace members can manage tax categories"
on public.tax_categories
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read goals" on public.financial_goals;
create policy "Workspace members can read goals"
on public.financial_goals
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage goals" on public.financial_goals;
create policy "Workspace members can manage goals"
on public.financial_goals
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read budgets" on public.category_budgets;
create policy "Workspace members can read budgets"
on public.category_budgets
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage budgets" on public.category_budgets;
create policy "Workspace members can manage budgets"
on public.category_budgets
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read import rules" on public.import_rules;
create policy "Workspace members can read import rules"
on public.import_rules
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage import rules" on public.import_rules;
create policy "Workspace members can manage import rules"
on public.import_rules
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read debt planner" on public.debt_reduction_debts;
create policy "Workspace members can read debt planner"
on public.debt_reduction_debts
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage debt planner" on public.debt_reduction_debts;
create policy "Workspace members can manage debt planner"
on public.debt_reduction_debts
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));

drop policy if exists "Workspace members can read import batches" on public.import_batches;
create policy "Workspace members can read import batches"
on public.import_batches
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can read transaction audit" on public.transaction_audit_events;
create policy "Workspace members can read transaction audit"
on public.transaction_audit_events
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can read reconciliation checks" on public.account_reconciliation_checks;
create policy "Workspace members can read reconciliation checks"
on public.account_reconciliation_checks
for select
using (public.is_active_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage reconciliation checks" on public.account_reconciliation_checks;
create policy "Workspace members can manage reconciliation checks"
on public.account_reconciliation_checks
for all
using (public.can_manage_workspace_finance(workspace_id))
with check (public.can_manage_workspace_finance(workspace_id));
