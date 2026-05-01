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

comment on column public.saas_plans.stripe_price_id is
  'Price ID da Stripe usado pelo Checkout para assinar este plano.';

comment on column public.saas_plans.stripe_lookup_key is
  'Lookup key estavel da Stripe para localizar o Price ativo do plano sem fixar Price ID no codigo.';

comment on column public.saas_subscriptions.stripe_status is
  'Status bruto recebido da Stripe para auditoria e suporte.';
