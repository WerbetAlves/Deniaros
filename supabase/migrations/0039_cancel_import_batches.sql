alter table if exists public.import_batches
drop constraint if exists import_batches_status_check;

alter table if exists public.import_batches
add constraint import_batches_status_check
check (status in ('completed', 'failed', 'partial', 'cancelled'));
