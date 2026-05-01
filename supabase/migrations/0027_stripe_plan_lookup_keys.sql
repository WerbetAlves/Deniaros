update public.saas_plans
set
  stripe_lookup_key = coalesce(nullif(stripe_lookup_key, ''), 'deniaros_silver_monthly'),
  updated_at = now()
where id = 'pro';

update public.saas_plans
set
  stripe_lookup_key = coalesce(nullif(stripe_lookup_key, ''), 'deniaros_gold_monthly'),
  updated_at = now()
where id = 'business_lite';

update public.saas_plans
set
  stripe_lookup_key = coalesce(nullif(stripe_lookup_key, ''), 'deniaros_family_monthly'),
  updated_at = now()
where id = 'family';

update public.saas_plans
set
  stripe_lookup_key = null,
  updated_at = now()
where id in ('free', 'platinum_private')
and stripe_lookup_key is not null;
