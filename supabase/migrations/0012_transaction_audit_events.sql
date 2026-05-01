alter table public.transactions
add column if not exists reconciled_at timestamptz;

alter table public.transactions
add column if not exists reconciled_by uuid references auth.users(id) on delete set null;

create table if not exists public.transaction_audit_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  transaction_id uuid references public.transactions(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  source text not null default 'system',
  before_status text,
  after_status text,
  note text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint transaction_audit_events_type_check check (
    event_type in (
      'imported_posted',
      'imported_deleted',
      'imported_rule_applied',
      'manual_adjustment'
    )
  )
);

create index if not exists transaction_audit_events_workspace_id_idx
on public.transaction_audit_events(workspace_id, created_at desc);

create index if not exists transaction_audit_events_transaction_id_idx
on public.transaction_audit_events(workspace_id, transaction_id)
where transaction_id is not null;

create index if not exists transactions_reconciled_at_idx
on public.transactions(workspace_id, reconciled_at)
where reconciled_at is not null;

alter table public.transaction_audit_events enable row level security;
grant all on table public.transaction_audit_events to authenticated;

create policy "Users can manage workspace transaction audit events"
on public.transaction_audit_events
for all
using (
  exists (
    select 1 from public.workspaces
    where workspaces.id = transaction_audit_events.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.workspaces
    where workspaces.id = transaction_audit_events.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);
