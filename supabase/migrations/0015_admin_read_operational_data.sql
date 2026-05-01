drop policy if exists "Admins can read all accounts" on public.accounts;
create policy "Admins can read all accounts"
on public.accounts
for select
using (public.is_saas_admin());

drop policy if exists "Admins can read all categories" on public.categories;
create policy "Admins can read all categories"
on public.categories
for select
using (public.is_saas_admin());

drop policy if exists "Admins can read all payees" on public.payees;
create policy "Admins can read all payees"
on public.payees
for select
using (public.is_saas_admin());

drop policy if exists "Admins can read all transactions" on public.transactions;
create policy "Admins can read all transactions"
on public.transactions
for select
using (public.is_saas_admin());

drop policy if exists "Admins can read all scheduled items" on public.scheduled_items;
create policy "Admins can read all scheduled items"
on public.scheduled_items
for select
using (public.is_saas_admin());

drop policy if exists "Admins can read all import batches" on public.import_batches;
create policy "Admins can read all import batches"
on public.import_batches
for select
using (public.is_saas_admin());

drop policy if exists "Admins can read all transaction audit events" on public.transaction_audit_events;
create policy "Admins can read all transaction audit events"
on public.transaction_audit_events
for select
using (public.is_saas_admin());
