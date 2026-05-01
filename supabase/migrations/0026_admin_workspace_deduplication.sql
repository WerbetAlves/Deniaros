with workspace_activity as (
  select
    workspaces.id,
    exists (
      select 1 from public.saas_subscriptions
      where saas_subscriptions.workspace_id = workspaces.id
    ) as has_subscription,
    exists (
      select 1 from public.transactions
      where transactions.workspace_id = workspaces.id
    ) or exists (
      select 1 from public.import_batches
      where import_batches.workspace_id = workspaces.id
    ) or exists (
      select 1 from public.saas_support_tickets
      where saas_support_tickets.workspace_id = workspaces.id
    ) or exists (
      select 1 from public.category_budgets
      where category_budgets.workspace_id = workspaces.id
    ) or exists (
      select 1 from public.financial_goals
      where financial_goals.workspace_id = workspaces.id
    ) or exists (
      select 1 from public.debt_reduction_debts
      where debt_reduction_debts.workspace_id = workspaces.id
    ) or exists (
      select 1 from public.account_reconciliation_checks
      where account_reconciliation_checks.workspace_id = workspaces.id
    ) as has_user_activity
  from public.workspaces
),
ranked_personal_workspaces as (
  select
    workspaces.id,
    row_number() over (
      partition by workspaces.owner_id, workspaces.type, lower(trim(workspaces.name))
      order by
        workspace_activity.has_subscription desc,
        workspace_activity.has_user_activity desc,
        workspaces.created_at asc,
        workspaces.id asc
    ) as duplicate_rank,
    workspace_activity.has_subscription,
    workspace_activity.has_user_activity
  from public.workspaces
  join workspace_activity on workspace_activity.id = workspaces.id
  where workspaces.type = 'personal'
)
delete from public.workspaces
using ranked_personal_workspaces
where workspaces.id = ranked_personal_workspaces.id
  and ranked_personal_workspaces.duplicate_rank > 1
  and ranked_personal_workspaces.has_subscription is false
  and ranked_personal_workspaces.has_user_activity is false;

create index if not exists workspaces_owner_type_name_lookup_idx
on public.workspaces(owner_id, type, lower(trim(name)));

create or replace function public.prevent_duplicate_personal_workspace()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.type = 'personal' and exists (
    select 1
    from public.workspaces
    where owner_id = new.owner_id
      and type = new.type
      and lower(trim(name)) = lower(trim(new.name))
      and id <> new.id
  ) then
    raise exception 'Duplicate personal workspace for this owner is not allowed.';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_duplicate_personal_workspace_trigger on public.workspaces;

create trigger prevent_duplicate_personal_workspace_trigger
before insert or update of owner_id, type, name on public.workspaces
for each row
execute function public.prevent_duplicate_personal_workspace();
