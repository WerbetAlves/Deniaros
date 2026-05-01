alter table public.transactions
add column if not exists reconciled_at timestamptz;

alter table public.transactions
add column if not exists reconciled_by uuid references auth.users(id) on delete set null;

create index if not exists transactions_reconciled_at_idx
on public.transactions(workspace_id, reconciled_at)
where reconciled_at is not null;

alter table public.transaction_audit_events
drop constraint if exists transaction_audit_events_type_check;

alter table public.transaction_audit_events
add constraint transaction_audit_events_type_check check (
  event_type in (
    'imported_posted',
    'imported_deleted',
    'imported_rule_applied',
    'manual_adjustment',
    'transaction_created',
    'transaction_updated',
    'transaction_deleted',
    'transaction_reconciled',
    'transaction_unreconciled',
    'scheduled_settled',
    'scheduled_updated',
    'scheduled_deleted'
  )
);
