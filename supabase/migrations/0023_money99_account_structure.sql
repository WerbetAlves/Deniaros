do $$
begin
  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.account_type'::regtype
      and enumlabel = 'asset'
  ) then
    alter type public.account_type add value 'asset';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.account_type'::regtype
      and enumlabel = 'liability'
  ) then
    alter type public.account_type add value 'liability';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.account_type'::regtype
      and enumlabel = 'loan'
  ) then
    alter type public.account_type add value 'loan';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.account_type'::regtype
      and enumlabel = 'investment'
  ) then
    alter type public.account_type add value 'investment';
  end if;

  if not exists (
    select 1
    from pg_enum
    where enumtypid = 'public.account_type'::regtype
      and enumlabel = 'retirement'
  ) then
    alter type public.account_type add value 'retirement';
  end if;
end $$;

alter table public.accounts
add column if not exists account_group text not null default 'daily_spending';

alter table public.accounts
add column if not exists is_favorite boolean not null default false;

update public.accounts
set account_group = case
  when type = 'savings' then 'short_term_savings'
  when type = 'credit' then 'debt'
  else coalesce(account_group, 'daily_spending')
end
where account_group is null
   or account_group = 'daily_spending';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_account_group_check'
  ) then
    alter table public.accounts
    add constraint accounts_account_group_check
    check (
      account_group in (
        'daily_spending',
        'short_term_savings',
        'long_term_savings',
        'retirement',
        'debt',
        'excluded'
      )
    );
  end if;
end $$;

create index if not exists accounts_account_group_idx
on public.accounts(workspace_id, account_group);

create index if not exists accounts_favorite_idx
on public.accounts(workspace_id, is_favorite)
where is_favorite = true;
