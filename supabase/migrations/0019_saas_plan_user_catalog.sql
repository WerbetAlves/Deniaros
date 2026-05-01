drop policy if exists "Users can read active public saas plans" on public.saas_plans;
create policy "Users can read active public saas plans"
on public.saas_plans
for select
using (
  is_active = true
  and is_public = true
);

drop policy if exists "Users can read own current saas plan" on public.saas_plans;
create policy "Users can read own current saas plan"
on public.saas_plans
for select
using (
  exists (
    select 1
    from public.saas_subscriptions
    where saas_subscriptions.plan_id = saas_plans.id
    and saas_subscriptions.user_id = auth.uid()
  )
);
