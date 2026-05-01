create table public.import_rules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  match_field text not null default 'description',
  match_type text not null default 'contains',
  pattern text not null,
  scope_account_id uuid references public.accounts(id) on delete set null,
  set_category_id uuid references public.categories(id) on delete set null,
  set_payee_id uuid references public.payees(id) on delete set null,
  set_status text not null default 'keep',
  priority integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint import_rules_match_field_check check (match_field in ('description', 'payee')),
  constraint import_rules_match_type_check check (match_type in ('contains', 'starts_with', 'equals')),
  constraint import_rules_set_status_check check (set_status in ('keep', 'pending', 'posted')),
  constraint import_rules_priority_check check (priority between 0 and 999)
);

create index import_rules_workspace_id_idx on public.import_rules(workspace_id);
create index import_rules_priority_idx on public.import_rules(workspace_id, priority, created_at);

alter table public.import_rules enable row level security;
grant all on table public.import_rules to authenticated;

create policy "Users can manage workspace import rules"
on public.import_rules
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = import_rules.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = import_rules.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);
