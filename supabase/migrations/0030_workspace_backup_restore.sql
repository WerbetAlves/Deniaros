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
    'support_review',
    'admin_financial_review',
    'admin_operational_review'
  )
);

create or replace function public.deniaros_restore_table_rows(
  backup_payload jsonb,
  table_name text,
  target_workspace_id uuid
)
returns jsonb
language sql
stable
as $$
  select coalesce(
    jsonb_agg(
      jsonb_set(row_value, '{workspace_id}', to_jsonb(target_workspace_id::text), true)
    ),
    '[]'::jsonb
  )
  from jsonb_array_elements(
    coalesce(backup_payload #> array['tables', table_name, 'data'], '[]'::jsonb)
  ) as source(row_value)
  where jsonb_typeof(row_value) = 'object';
$$;

create or replace function public.restore_workspace_backup(
  target_workspace_id uuid,
  backup_payload jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  authenticated_user_id uuid := auth.uid();
  backup_user_id uuid := nullif(backup_payload #>> '{user,id}', '')::uuid;
  backup_workspace jsonb := coalesce(backup_payload -> 'workspace', '{}'::jsonb);
  inserted_count integer := 0;
  restored_counts jsonb := '{}'::jsonb;
  total_restored integer := 0;
begin
  if authenticated_user_id is null then
    raise exception 'Usuario nao autenticado.';
  end if;

  if coalesce(backup_payload ->> 'app', '') <> 'Deniaros' then
    raise exception 'Arquivo de backup invalido.';
  end if;

  if coalesce((backup_payload ->> 'exportVersion')::integer, 0) <> 1 then
    raise exception 'Versao de backup nao suportada.';
  end if;

  if backup_user_id is distinct from authenticated_user_id then
    raise exception 'Este backup pertence a outro usuario.';
  end if;

  if not exists (
    select 1
    from public.workspaces
    where id = target_workspace_id
    and owner_id = authenticated_user_id
  ) then
    raise exception 'Workspace nao encontrado ou sem permissao.';
  end if;

  update public.workspaces
  set
    name = coalesce(nullif(backup_workspace ->> 'name', ''), name),
    type = coalesce(nullif(backup_workspace ->> 'type', '')::public.workspace_type, type),
    base_currency = coalesce(nullif(backup_workspace ->> 'base_currency', ''), base_currency),
    locale = coalesce(nullif(backup_workspace ->> 'locale', ''), locale),
    time_zone = coalesce(nullif(backup_workspace ->> 'time_zone', ''), time_zone),
    country_code = coalesce(nullif(backup_workspace ->> 'country_code', ''), country_code),
    updated_at = now()
  where id = target_workspace_id
  and owner_id = authenticated_user_id;

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

  insert into public.categories
  select * from jsonb_populate_recordset(
    null::public.categories,
    public.deniaros_restore_table_rows(backup_payload, 'categories', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('categories', inserted_count);

  insert into public.payees
  select * from jsonb_populate_recordset(
    null::public.payees,
    public.deniaros_restore_table_rows(backup_payload, 'payees', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('payees', inserted_count);

  insert into public.accounts
  select * from jsonb_populate_recordset(
    null::public.accounts,
    public.deniaros_restore_table_rows(backup_payload, 'accounts', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('accounts', inserted_count);

  insert into public.exchange_rates
  select * from jsonb_populate_recordset(
    null::public.exchange_rates,
    public.deniaros_restore_table_rows(backup_payload, 'exchange_rates', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('exchange_rates', inserted_count);

  insert into public.personal_profiles
  select * from jsonb_populate_recordset(
    null::public.personal_profiles,
    public.deniaros_restore_table_rows(backup_payload, 'personal_profiles', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('personal_profiles', inserted_count);

  insert into public.home_inventory_items
  select * from jsonb_populate_recordset(
    null::public.home_inventory_items,
    public.deniaros_restore_table_rows(backup_payload, 'home_inventory_items', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('home_inventory_items', inserted_count);

  insert into public.tax_categories
  select * from jsonb_populate_recordset(
    null::public.tax_categories,
    public.deniaros_restore_table_rows(backup_payload, 'tax_categories', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('tax_categories', inserted_count);

  insert into public.financial_goals
  select * from jsonb_populate_recordset(
    null::public.financial_goals,
    public.deniaros_restore_table_rows(backup_payload, 'financial_goals', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('financial_goals', inserted_count);

  insert into public.category_budgets
  select * from jsonb_populate_recordset(
    null::public.category_budgets,
    public.deniaros_restore_table_rows(backup_payload, 'category_budgets', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('category_budgets', inserted_count);

  insert into public.import_batches
  select * from jsonb_populate_recordset(
    null::public.import_batches,
    public.deniaros_restore_table_rows(backup_payload, 'import_batches', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('import_batches', inserted_count);

  insert into public.import_rules
  select * from jsonb_populate_recordset(
    null::public.import_rules,
    public.deniaros_restore_table_rows(backup_payload, 'import_rules', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('import_rules', inserted_count);

  insert into public.debt_reduction_debts
  select * from jsonb_populate_recordset(
    null::public.debt_reduction_debts,
    public.deniaros_restore_table_rows(backup_payload, 'debt_reduction_debts', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('debt_reduction_debts', inserted_count);

  insert into public.scheduled_items
  select * from jsonb_populate_recordset(
    null::public.scheduled_items,
    public.deniaros_restore_table_rows(backup_payload, 'scheduled_items', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('scheduled_items', inserted_count);

  insert into public.transactions
  select * from jsonb_populate_recordset(
    null::public.transactions,
    public.deniaros_restore_table_rows(backup_payload, 'transactions', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('transactions', inserted_count);

  insert into public.transaction_audit_events
  select * from jsonb_populate_recordset(
    null::public.transaction_audit_events,
    public.deniaros_restore_table_rows(backup_payload, 'transaction_audit_events', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('transaction_audit_events', inserted_count);

  insert into public.account_reconciliation_checks
  select * from jsonb_populate_recordset(
    null::public.account_reconciliation_checks,
    public.deniaros_restore_table_rows(backup_payload, 'account_reconciliation_checks', target_workspace_id)
  );
  get diagnostics inserted_count = row_count;
  total_restored := total_restored + inserted_count;
  restored_counts := restored_counts || jsonb_build_object('account_reconciliation_checks', inserted_count);

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
    'backup_restore',
    'Backup restaurado automaticamente pelo usuario.',
    jsonb_build_object(
      'exportedAt', backup_payload ->> 'exportedAt',
      'restoredCounts', restored_counts,
      'totalRestored', total_restored
    )
  );

  return jsonb_build_object(
    'workspaceId', target_workspace_id,
    'restoredCounts', restored_counts,
    'totalRestored', total_restored
  );
end;
$$;

grant execute on function public.restore_workspace_backup(uuid, jsonb) to authenticated;
