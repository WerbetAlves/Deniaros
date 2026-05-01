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
    'scheduled_settled',
    'scheduled_updated',
    'scheduled_deleted'
  )
);
