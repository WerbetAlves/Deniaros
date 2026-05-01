alter table public.saas_plans
add column if not exists stripe_product_id text,
add column if not exists stripe_price_id text,
add column if not exists stripe_lookup_key text;

alter table public.saas_subscriptions
add column if not exists stripe_price_id text,
add column if not exists stripe_status text,
add column if not exists cancel_at_period_end boolean not null default false;

create unique index if not exists saas_plans_stripe_price_id_unique
on public.saas_plans(stripe_price_id)
where stripe_price_id is not null;

create unique index if not exists saas_plans_stripe_lookup_key_unique
on public.saas_plans(stripe_lookup_key)
where stripe_lookup_key is not null;

create index if not exists saas_subscriptions_stripe_customer_id_idx
on public.saas_subscriptions(stripe_customer_id)
where stripe_customer_id is not null;

create unique index if not exists saas_subscriptions_stripe_subscription_id_unique
on public.saas_subscriptions(stripe_subscription_id)
where stripe_subscription_id is not null;

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
