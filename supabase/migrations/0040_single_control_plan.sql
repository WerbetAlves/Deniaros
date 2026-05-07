update public.saas_plans
set
  name = 'Deniaros Controle',
  tier = 'pro',
  price_cents = 2900,
  billing_interval = 'month',
  is_public = true,
  is_active = true,
  limits = jsonb_build_object(
    'workspaces', 1,
    'accounts', 20,
    'transactions', 10000,
    'ai_messages', 500,
    'seats', 1
  ),
  features = jsonb_build_object(
    'accounts_wallets', true,
    'manual_entries', true,
    'imports', true,
    'agenda', true,
    'reports_basic', true,
    'spending_simulator', true,
    'emergency_mode', true,
    'ai_deep_analysis', true,
    'open_finance', false
  ),
  stripe_lookup_key = 'deniaros_controle_monthly',
  stripe_price_id = null,
  stripe_product_id = null,
  updated_at = now()
where id = 'pro';

update public.saas_plans
set
  name = 'Deniaros Inteligente',
  is_public = false,
  is_active = true,
  stripe_lookup_key = null,
  stripe_price_id = null,
  stripe_product_id = null,
  updated_at = now()
where id = 'business_lite';

update public.saas_plans
set
  name = 'Deniaros Família',
  is_public = false,
  is_active = true,
  stripe_lookup_key = null,
  stripe_price_id = null,
  stripe_product_id = null,
  updated_at = now()
where id = 'family';

update public.saas_plans
set
  is_public = false,
  is_active = false,
  stripe_lookup_key = null,
  stripe_price_id = null,
  stripe_product_id = null,
  updated_at = now()
where id = 'free';

update public.saas_plans
set
  is_public = false,
  stripe_lookup_key = null,
  stripe_price_id = null,
  stripe_product_id = null,
  updated_at = now()
where id = 'platinum_private';
