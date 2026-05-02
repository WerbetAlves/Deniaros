# Supabase Setup

## Projeto

Use o projeto Supabase criado para o Deniaros.

Variaveis locais:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ypeabximtybioduroube.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_yEwMOUJTlVYB91Po6Ed05Q_j6X1AZ1N
```

## Aplicar migrations (ordem correta)

1. Abra o projeto no Supabase.
2. Va em `SQL Editor`.
3. Execute os scripts abaixo, um por vez, nesta ordem:

```text
supabase/migrations/0001_initial_schema.sql
supabase/migrations/0002_user_profiles_and_avatars.sql
supabase/migrations/0003_money99_classic_tools.sql
supabase/migrations/0004_planner_tools.sql
supabase/migrations/0005_import_rules.sql
supabase/migrations/0006_account_openfinance.sql
supabase/migrations/0007_personal_profile_classic_questionnaire.sql
supabase/migrations/0008_debt_reduction_planner.sql
supabase/migrations/0009_category_hierarchy_uniqueness.sql
supabase/migrations/0010_scheduled_settlement_trace.sql
supabase/migrations/0011_import_traceability.sql
supabase/migrations/0012_transaction_audit_events.sql
supabase/migrations/0013_manual_audit_event_types.sql
supabase/migrations/0014_saas_admin_foundation.sql
supabase/migrations/0015_admin_read_operational_data.sql
supabase/migrations/0016_admin_audit_events.sql
supabase/migrations/0017_support_ticket_user_visibility.sql
supabase/migrations/0018_support_ticket_messages.sql
supabase/migrations/0019_saas_plan_user_catalog.sql
supabase/migrations/0020_family_plan_positioning.sql
supabase/migrations/0021_admin_permissions_founder_policy.sql
supabase/migrations/0022_stripe_billing_connection.sql
supabase/migrations/0023_money99_account_structure.sql
supabase/migrations/0024_transaction_reconciliation_flow.sql
supabase/migrations/0025_account_reconciliation_checks.sql
supabase/migrations/0026_admin_workspace_deduplication.sql
supabase/migrations/0027_stripe_plan_lookup_keys.sql
```

Com isso, o projeto habilita:

- tipos enum do dominio financeiro
- `workspaces`
- `accounts`
- `categories`
- `payees`
- `transactions`
- `scheduled_items`
- `exchange_rates`
- `user_profiles` + bucket `profile-avatars`
- `personal_profiles`
- `home_inventory_items`
- `tax_categories`
- `financial_goals`
- `category_budgets`
- `import_rules`
- colunas Open Finance em `accounts`
- questionario classico Money99 em `personal_profiles`
- Row Level Security em todas as tabelas
- policies para o usuario acessar apenas os proprios workspaces

## Validacao depois de executar

No Supabase, confira em `Table Editor` se existem estas tabelas:

```text
workspaces
accounts
categories
payees
transactions
scheduled_items
exchange_rates
user_profiles
personal_profiles
home_inventory_items
tax_categories
financial_goals
category_budgets
import_rules
```

Em `Authentication`, crie ou confirme pelo menos um usuario de teste antes de inserir dados reais.

## Vercel

Quando conectar o GitHub na Vercel, configure as mesmas variaveis:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
NEXT_PUBLIC_APP_URL
GEMINI_API_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
```

Nao use service role key no frontend.

Em producao, dados de amostra nao devem ser habilitados. O Deniaros nunca deve trocar
uma sessao autenticada quebrada por dados ficticios.
