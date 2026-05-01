drop policy if exists "Users can read own support tickets" on public.saas_support_tickets;
create policy "Users can read own support tickets"
on public.saas_support_tickets
for select
using (requester_id = auth.uid());

drop policy if exists "Users can update own open support tickets" on public.saas_support_tickets;
create policy "Users can update own open support tickets"
on public.saas_support_tickets
for update
using (
  requester_id = auth.uid()
  and status in ('open', 'waiting')
)
with check (
  requester_id = auth.uid()
  and status in ('open', 'waiting')
);
