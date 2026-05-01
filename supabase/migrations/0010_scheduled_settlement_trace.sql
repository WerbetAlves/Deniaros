alter table public.transactions
add column if not exists scheduled_item_id uuid references public.scheduled_items(id) on delete set null;

alter table public.transactions
add column if not exists scheduled_occurrence_date date;

create unique index if not exists transactions_scheduled_occurrence_unique_idx
on public.transactions(workspace_id, scheduled_item_id, scheduled_occurrence_date)
where scheduled_item_id is not null and scheduled_occurrence_date is not null;

create index if not exists transactions_scheduled_item_id_idx
on public.transactions(workspace_id, scheduled_item_id);
