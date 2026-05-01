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
```

Nao use service role key no frontend.
