alter table public.accounts
  add column if not exists opening_balance_date date not null default current_date;
