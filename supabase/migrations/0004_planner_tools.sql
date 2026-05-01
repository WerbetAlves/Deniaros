create table public.financial_goals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  linked_account_id uuid references public.accounts(id) on delete set null,
  title text not null,
  goal_type text not null default 'reserve',
  priority text not null default 'important',
  status text not null default 'active',
  target_amount numeric(14, 2) not null default 0,
  current_amount numeric(14, 2) not null default 0,
  target_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint financial_goals_target_amount_check check (target_amount >= 0),
  constraint financial_goals_current_amount_check check (current_amount >= 0)
);

create table public.category_budgets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  period_month date not null,
  monthly_limit numeric(14, 2) not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint category_budgets_monthly_limit_check check (monthly_limit >= 0),
  constraint category_budgets_period_month_check check (
    date_trunc('month', period_month::timestamp)::date = period_month
  ),
  unique (workspace_id, category_id, period_month)
);

create index financial_goals_workspace_id_idx on public.financial_goals(workspace_id);
create index financial_goals_status_idx on public.financial_goals(workspace_id, status);
create index category_budgets_workspace_id_idx on public.category_budgets(workspace_id);
create index category_budgets_period_month_idx on public.category_budgets(workspace_id, period_month);

alter table public.financial_goals enable row level security;
alter table public.category_budgets enable row level security;

grant all on table public.financial_goals to authenticated;
grant all on table public.category_budgets to authenticated;

create policy "Users can manage workspace financial goals"
on public.financial_goals
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = financial_goals.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = financial_goals.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

create policy "Users can manage workspace budgets"
on public.category_budgets
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = category_budgets.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = category_budgets.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);
