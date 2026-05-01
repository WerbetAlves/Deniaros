create table if not exists public.account_reconciliation_checks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  checked_on date not null default current_date,
  statement_balance numeric(14, 2) not null,
  deniaros_balance numeric(14, 2) not null,
  difference numeric(14, 2) not null,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists account_reconciliation_checks_account_idx
on public.account_reconciliation_checks(workspace_id, account_id, checked_on desc, created_at desc);

alter table public.account_reconciliation_checks enable row level security;
grant all on table public.account_reconciliation_checks to authenticated;

create policy "Users can manage workspace account reconciliation checks"
on public.account_reconciliation_checks
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = account_reconciliation_checks.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = account_reconciliation_checks.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);
