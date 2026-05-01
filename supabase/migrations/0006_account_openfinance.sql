alter table public.accounts
add column if not exists connection_mode text not null default 'manual';

alter table public.accounts
add column if not exists openfinance_provider text;

alter table public.accounts
add column if not exists openfinance_status text not null default 'not_connected';

alter table public.accounts
add column if not exists external_account_ref text;

update public.accounts
set
  connection_mode = coalesce(connection_mode, 'manual'),
  openfinance_status = coalesce(openfinance_status, 'not_connected')
where
  connection_mode is null
  or openfinance_status is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_connection_mode_check'
  ) then
    alter table public.accounts
    add constraint accounts_connection_mode_check
    check (connection_mode in ('manual', 'openfinance'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_openfinance_status_check'
  ) then
    alter table public.accounts
    add constraint accounts_openfinance_status_check
    check (openfinance_status in ('not_connected', 'pending', 'connected', 'error'));
  end if;
end $$;

create index if not exists accounts_connection_mode_idx
on public.accounts(workspace_id, connection_mode);

create index if not exists accounts_openfinance_status_idx
on public.accounts(workspace_id, openfinance_status);
