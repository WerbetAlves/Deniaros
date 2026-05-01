create extension if not exists "pgcrypto";

create type public.workspace_type as enum ('personal', 'family', 'business');
create type public.account_type as enum ('checking', 'cash', 'credit', 'business', 'savings');
create type public.category_kind as enum ('income', 'expense');
create type public.payee_type as enum ('person', 'company', 'place');
create type public.transaction_status as enum ('posted', 'pending');
create type public.transaction_source as enum ('manual', 'imported', 'recurring', 'assistant');
create type public.schedule_kind as enum ('bill', 'deposit', 'saving');
create type public.schedule_status as enum ('scheduled', 'due_soon', 'overdue', 'paid');

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type public.workspace_type not null default 'personal',
  base_currency text not null default 'USD',
  locale text not null default 'en-US',
  time_zone text not null default 'UTC',
  country_code text not null default 'US',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_base_currency_check check (base_currency ~ '^[A-Z]{3}$'),
  constraint workspaces_country_code_check check (country_code ~ '^[A-Z]{2}$')
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type public.account_type not null,
  currency text not null,
  opening_balance numeric(14, 2) not null default 0,
  color text not null default 'emerald',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint accounts_currency_check check (currency ~ '^[A-Z]{3}$')
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete set null,
  name text not null,
  kind public.category_kind not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, name, kind)
);

create table public.payees (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  type public.payee_type not null default 'company',
  notes text,
  created_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  transfer_account_id uuid references public.accounts(id) on delete set null,
  category_id uuid references public.categories(id) on delete set null,
  payee_id uuid references public.payees(id) on delete set null,
  description text not null,
  amount numeric(14, 2) not null,
  currency text not null,
  occurred_on date not null,
  posted_on date,
  status public.transaction_status not null default 'posted',
  source public.transaction_source not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_currency_check check (currency ~ '^[A-Z]{3}$')
);

create table public.scheduled_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  payee_id uuid references public.payees(id) on delete set null,
  kind public.schedule_kind not null,
  title text not null,
  amount numeric(14, 2) not null,
  currency text not null,
  due_on date not null,
  recurrence text not null default 'once',
  status public.schedule_status not null default 'scheduled',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_items_currency_check check (currency ~ '^[A-Z]{3}$')
);

create table public.exchange_rates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  base_currency text not null,
  quote_currency text not null,
  rate numeric(18, 8) not null,
  rate_date date not null,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  unique (workspace_id, base_currency, quote_currency, rate_date),
  constraint exchange_rates_base_currency_check check (base_currency ~ '^[A-Z]{3}$'),
  constraint exchange_rates_quote_currency_check check (quote_currency ~ '^[A-Z]{3}$')
);

create index accounts_workspace_id_idx on public.accounts(workspace_id);
create index categories_workspace_id_idx on public.categories(workspace_id);
create index payees_workspace_id_idx on public.payees(workspace_id);
create index transactions_workspace_id_idx on public.transactions(workspace_id);
create index transactions_account_id_idx on public.transactions(account_id);
create index transactions_occurred_on_idx on public.transactions(occurred_on);
create index scheduled_items_workspace_id_idx on public.scheduled_items(workspace_id);
create index scheduled_items_due_on_idx on public.scheduled_items(due_on);
create index exchange_rates_workspace_id_idx on public.exchange_rates(workspace_id);

alter table public.workspaces enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.payees enable row level security;
alter table public.transactions enable row level security;
alter table public.scheduled_items enable row level security;
alter table public.exchange_rates enable row level security;

grant usage on schema public to authenticated;
grant all on table public.workspaces to authenticated;
grant all on table public.accounts to authenticated;
grant all on table public.categories to authenticated;
grant all on table public.payees to authenticated;
grant all on table public.transactions to authenticated;
grant all on table public.scheduled_items to authenticated;
grant all on table public.exchange_rates to authenticated;

create policy "Users can manage own workspaces"
on public.workspaces
for all
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "Users can manage workspace accounts"
on public.accounts
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = accounts.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = accounts.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

create policy "Users can manage workspace categories"
on public.categories
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = categories.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = categories.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

create policy "Users can manage workspace payees"
on public.payees
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = payees.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = payees.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

create policy "Users can manage workspace transactions"
on public.transactions
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = transactions.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = transactions.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

create policy "Users can manage workspace scheduled items"
on public.scheduled_items
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = scheduled_items.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = scheduled_items.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

create policy "Users can manage workspace exchange rates"
on public.exchange_rates
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = exchange_rates.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = exchange_rates.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);
