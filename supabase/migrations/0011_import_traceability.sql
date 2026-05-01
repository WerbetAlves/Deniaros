create table if not exists public.import_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  source_type text not null default 'csv',
  original_filename text,
  row_count integer not null default 0,
  imported_count integer not null default 0,
  duplicate_count integer not null default 0,
  rule_match_count integer not null default 0,
  status text not null default 'completed',
  summary text,
  created_at timestamptz not null default now(),
  constraint import_batches_counts_check check (
    row_count >= 0
    and imported_count >= 0
    and duplicate_count >= 0
    and rule_match_count >= 0
  ),
  constraint import_batches_source_type_check check (
    source_type in ('csv', 'ofx', 'qif', 'openfinance', 'manual')
  ),
  constraint import_batches_status_check check (status in ('completed', 'failed', 'partial'))
);

create index if not exists import_batches_workspace_id_idx
on public.import_batches(workspace_id, created_at desc);

create index if not exists import_batches_account_id_idx
on public.import_batches(workspace_id, account_id);

alter table public.import_batches enable row level security;
grant all on table public.import_batches to authenticated;

create policy "Users can manage workspace import batches"
on public.import_batches
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = import_batches.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = import_batches.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

alter table public.transactions
add column if not exists import_batch_id uuid references public.import_batches(id) on delete set null;

alter table public.transactions
add column if not exists import_signature text;

alter table public.transactions
add column if not exists import_rule_id uuid references public.import_rules(id) on delete set null;

create unique index if not exists transactions_import_signature_unique_idx
on public.transactions(workspace_id, account_id, import_signature)
where import_signature is not null;

create index if not exists transactions_import_batch_id_idx
on public.transactions(workspace_id, import_batch_id)
where import_batch_id is not null;

create index if not exists transactions_import_rule_id_idx
on public.transactions(workspace_id, import_rule_id)
where import_rule_id is not null;
