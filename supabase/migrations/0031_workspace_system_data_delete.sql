alter table public.data_access_events
drop constraint if exists data_access_events_scope_check;

alter table public.data_access_events
add constraint data_access_events_scope_check check (
  access_scope in (
    'privacy_settings',
    'financial_context_ai',
    'backup_export',
    'backup_restore',
    'delete_request',
    'system_data_delete',
    'support_review',
    'admin_financial_review',
    'admin_operational_review'
  )
);

create or replace function public.delete_workspace_system_data(
  target_workspace_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_user_id uuid := auth.uid();
  deleted_counts jsonb := '{}'::jsonb;
  total_deleted integer := 0;
begin
  if authenticated_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if not exists (
    select 1
    from public.workspaces
    where id = target_workspace_id
    and owner_id = authenticated_user_id
  ) then
    raise exception 'Workspace nao encontrado ou sem permissao.';
  end if;

  deleted_counts := jsonb_build_object(
    'saas_support_notifications', (select count(*) from public.saas_support_notifications where workspace_id = target_workspace_id),
    'saas_support_ticket_messages', (select count(*) from public.saas_support_ticket_messages where workspace_id = target_workspace_id),
    'saas_support_tickets', (select count(*) from public.saas_support_tickets where workspace_id = target_workspace_id),
    'transaction_audit_events', (select count(*) from public.transaction_audit_events where workspace_id = target_workspace_id),
    'account_reconciliation_checks', (select count(*) from public.account_reconciliation_checks where workspace_id = target_workspace_id),
    'transactions', (select count(*) from public.transactions where workspace_id = target_workspace_id),
    'scheduled_items', (select count(*) from public.scheduled_items where workspace_id = target_workspace_id),
    'category_budgets', (select count(*) from public.category_budgets where workspace_id = target_workspace_id),
    'financial_goals', (select count(*) from public.financial_goals where workspace_id = target_workspace_id),
    'debt_reduction_debts', (select count(*) from public.debt_reduction_debts where workspace_id = target_workspace_id),
    'import_rules', (select count(*) from public.import_rules where workspace_id = target_workspace_id),
    'import_batches', (select count(*) from public.import_batches where workspace_id = target_workspace_id),
    'tax_categories', (select count(*) from public.tax_categories where workspace_id = target_workspace_id),
    'home_inventory_items', (select count(*) from public.home_inventory_items where workspace_id = target_workspace_id),
    'personal_profiles', (select count(*) from public.personal_profiles where workspace_id = target_workspace_id),
    'exchange_rates', (select count(*) from public.exchange_rates where workspace_id = target_workspace_id),
    'accounts', (select count(*) from public.accounts where workspace_id = target_workspace_id),
    'payees', (select count(*) from public.payees where workspace_id = target_workspace_id),
    'categories', (select count(*) from public.categories where workspace_id = target_workspace_id)
  );

  select coalesce(sum(value::integer), 0)
  into total_deleted
  from jsonb_each_text(deleted_counts);

  delete from public.saas_support_notifications where workspace_id = target_workspace_id;
  delete from public.saas_support_ticket_messages where workspace_id = target_workspace_id;
  delete from public.saas_support_tickets where workspace_id = target_workspace_id;
  delete from public.transaction_audit_events where workspace_id = target_workspace_id;
  delete from public.account_reconciliation_checks where workspace_id = target_workspace_id;
  delete from public.transactions where workspace_id = target_workspace_id;
  delete from public.scheduled_items where workspace_id = target_workspace_id;
  delete from public.category_budgets where workspace_id = target_workspace_id;
  delete from public.financial_goals where workspace_id = target_workspace_id;
  delete from public.debt_reduction_debts where workspace_id = target_workspace_id;
  delete from public.import_rules where workspace_id = target_workspace_id;
  delete from public.import_batches where workspace_id = target_workspace_id;
  delete from public.tax_categories where workspace_id = target_workspace_id;
  delete from public.home_inventory_items where workspace_id = target_workspace_id;
  delete from public.personal_profiles where workspace_id = target_workspace_id;
  delete from public.exchange_rates where workspace_id = target_workspace_id;
  delete from public.accounts where workspace_id = target_workspace_id;
  delete from public.payees where workspace_id = target_workspace_id;
  delete from public.categories where workspace_id = target_workspace_id;

  update public.workspaces
  set updated_at = now()
  where id = target_workspace_id
  and owner_id = authenticated_user_id;

  insert into public.privacy_preferences (
    user_id,
    workspace_id,
    delete_requested_at,
    delete_request_status,
    updated_at
  )
  values (
    authenticated_user_id,
    target_workspace_id,
    now(),
    'completed',
    now()
  )
  on conflict (user_id, workspace_id) do update
  set
    delete_requested_at = coalesce(public.privacy_preferences.delete_requested_at, excluded.delete_requested_at),
    delete_request_status = 'completed',
    updated_at = now();

  insert into public.data_access_events (
    workspace_id,
    actor_id,
    actor_role,
    access_scope,
    access_reason,
    metadata
  )
  values (
    target_workspace_id,
    authenticated_user_id,
    'owner',
    'system_data_delete',
    'Dados do sistema apagados pelo usuario com dupla confirmacao.',
    jsonb_build_object(
      'deletedCounts', deleted_counts,
      'preserved', jsonb_build_array(
        'auth_user',
        'workspace',
        'saas_subscription',
        'privacy_preferences',
        'data_access_events',
        'admin_audit_events'
      ),
      'totalDeleted', total_deleted
    )
  );

  return jsonb_build_object(
    'deletedCounts', deleted_counts,
    'totalDeleted', total_deleted,
    'workspaceId', target_workspace_id
  );
end;
$$;

grant execute on function public.delete_workspace_system_data(uuid) to authenticated;
