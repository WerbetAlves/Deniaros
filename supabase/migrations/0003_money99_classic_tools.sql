create table public.personal_profiles (
  workspace_id uuid primary key references public.workspaces(id) on delete cascade,
  planning_horizon text not null default 'balanced',
  marital_status text not null default 'single',
  housing_status text not null default 'other',
  birth_year integer,
  dependents integer not null default 0,
  monthly_income numeric(14, 2) not null default 0,
  monthly_fixed_costs numeric(14, 2) not null default 0,
  emergency_reserve_target numeric(14, 2) not null default 0,
  retirement_goal numeric(14, 2) not null default 0,
  risk_tolerance text not null default 'moderate',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint personal_profiles_birth_year_check check (birth_year is null or birth_year between 1900 and 2100),
  constraint personal_profiles_dependents_check check (dependents >= 0)
);

create table public.home_inventory_items (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  item_name text not null,
  category text not null default 'Outros',
  location text,
  quantity integer not null default 1,
  estimated_value numeric(14, 2) not null default 0,
  purchase_date date,
  condition text not null default 'good',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint home_inventory_items_quantity_check check (quantity > 0)
);

create table public.tax_categories (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  name text not null,
  tax_code text,
  applies_to text not null default 'expense',
  deductible boolean not null default false,
  rate numeric(7, 4),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index home_inventory_items_workspace_id_idx on public.home_inventory_items(workspace_id);
create index tax_categories_workspace_id_idx on public.tax_categories(workspace_id);

alter table public.personal_profiles enable row level security;
alter table public.home_inventory_items enable row level security;
alter table public.tax_categories enable row level security;

grant all on table public.personal_profiles to authenticated;
grant all on table public.home_inventory_items to authenticated;
grant all on table public.tax_categories to authenticated;

create policy "Users can manage workspace personal profiles"
on public.personal_profiles
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = personal_profiles.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = personal_profiles.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

create policy "Users can manage workspace inventory"
on public.home_inventory_items
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = home_inventory_items.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = home_inventory_items.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

create policy "Users can manage workspace tax categories"
on public.tax_categories
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = tax_categories.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = tax_categories.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);
