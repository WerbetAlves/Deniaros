create table public.debt_reduction_debts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  linked_account_id uuid references public.accounts(id) on delete set null,
  name text not null,
  balance numeric(14, 2) not null default 0,
  annual_interest_rate numeric(7, 4) not null default 0,
  minimum_payment numeric(14, 2) not null default 0,
  planned_payment numeric(14, 2) not null default 0,
  credit_limit numeric(14, 2) not null default 0,
  due_day integer,
  included_in_plan boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint debt_reduction_balance_check check (balance >= 0),
  constraint debt_reduction_interest_check check (annual_interest_rate >= 0),
  constraint debt_reduction_minimum_payment_check check (minimum_payment >= 0),
  constraint debt_reduction_planned_payment_check check (planned_payment >= 0),
  constraint debt_reduction_credit_limit_check check (credit_limit >= 0),
  constraint debt_reduction_due_day_check check (due_day is null or due_day between 1 and 31)
);

create index debt_reduction_debts_workspace_id_idx
on public.debt_reduction_debts(workspace_id);

create index debt_reduction_debts_included_idx
on public.debt_reduction_debts(workspace_id, included_in_plan);

alter table public.debt_reduction_debts enable row level security;

grant all on table public.debt_reduction_debts to authenticated;

create policy "Users can manage workspace debt planner"
on public.debt_reduction_debts
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = debt_reduction_debts.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = debt_reduction_debts.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);
