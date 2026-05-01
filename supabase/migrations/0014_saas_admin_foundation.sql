create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint admin_users_role_check check (role in ('founder', 'admin', 'support', 'billing'))
);

create or replace function public.is_saas_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
    and admin_users.is_active = true
  );
$$;

grant execute on function public.is_saas_admin() to authenticated;

create table if not exists public.saas_plans (
  id text primary key,
  name text not null,
  tier text not null,
  price_cents integer not null default 0,
  billing_interval text not null default 'month',
  is_public boolean not null default true,
  is_active boolean not null default true,
  limits jsonb not null default '{}'::jsonb,
  features jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saas_plans_price_check check (price_cents >= 0),
  constraint saas_plans_interval_check check (billing_interval in ('month', 'year', 'manual')),
  constraint saas_plans_tier_check check (tier in ('free', 'pro', 'family', 'business', 'platinum'))
);

insert into public.saas_plans (id, name, tier, price_cents, billing_interval, is_public, limits, features)
values
  (
    'free',
    'Free',
    'free',
    0,
    'month',
    true,
    '{"workspaces":1,"accounts":2,"transactions":100,"ai_messages":10}'::jsonb,
    '{"agenda":true,"reports_basic":true,"imports":false,"open_finance":false,"support_priority":false}'::jsonb
  ),
  (
    'pro',
    'Pro',
    'pro',
    4900,
    'month',
    true,
    '{"workspaces":1,"accounts":20,"transactions":10000,"ai_messages":500}'::jsonb,
    '{"agenda":true,"reports_advanced":true,"imports":true,"open_finance":false,"support_priority":false}'::jsonb
  ),
  (
    'family',
    'Family',
    'family',
    9900,
    'month',
    true,
    '{"workspaces":3,"accounts":50,"transactions":50000,"ai_messages":1500,"seats":5}'::jsonb,
    '{"agenda":true,"reports_advanced":true,"imports":true,"open_finance":true,"support_priority":true}'::jsonb
  ),
  (
    'business_lite',
    'Business Lite',
    'business',
    12900,
    'month',
    true,
    '{"workspaces":5,"accounts":100,"transactions":100000,"ai_messages":3000,"seats":10}'::jsonb,
    '{"agenda":true,"reports_advanced":true,"imports":true,"open_finance":true,"support_priority":true,"team_controls":true}'::jsonb
  ),
  (
    'platinum_private',
    'Platina Privado',
    'platinum',
    0,
    'manual',
    false,
    '{"workspaces":999,"accounts":999,"transactions":999999,"ai_messages":999999,"seats":999}'::jsonb,
    '{"agenda":true,"reports_advanced":true,"imports":true,"open_finance":true,"support_priority":true,"team_controls":true,"founder_release_channel":true}'::jsonb
  )
on conflict (id) do update
set
  name = excluded.name,
  tier = excluded.tier,
  price_cents = excluded.price_cents,
  billing_interval = excluded.billing_interval,
  is_public = excluded.is_public,
  limits = excluded.limits,
  features = excluded.features,
  updated_at = now();

create table if not exists public.saas_subscriptions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.saas_plans(id),
  status text not null default 'trialing',
  seats integer not null default 1,
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saas_subscriptions_status_check check (
    status in ('trialing', 'active', 'past_due', 'canceled', 'suspended', 'manual')
  ),
  constraint saas_subscriptions_seats_check check (seats > 0),
  unique (workspace_id)
);

create index if not exists saas_subscriptions_user_id_idx
on public.saas_subscriptions(user_id);

create index if not exists saas_subscriptions_status_idx
on public.saas_subscriptions(status, plan_id);

create table if not exists public.feature_flags (
  id text primary key,
  name text not null,
  description text,
  is_enabled boolean not null default false,
  rollout_plan text not null default 'manual',
  allowed_plan_ids text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.feature_flags (id, name, description, is_enabled, rollout_plan, allowed_plan_ids)
values
  ('open_finance_beta', 'Open Finance beta', 'Conexão direta com bancos em canal controlado.', false, 'manual', array['family','business_lite','platinum_private']),
  ('ai_deep_analysis', 'Análise profunda com IA', 'Leitura estratégica de relatórios, orçamento e decisões.', true, 'plan_based', array['pro','family','business_lite','platinum_private']),
  ('platinum_private_access', 'Acesso Platina Privado', 'Recursos privados liberados manualmente pelo fundador.', true, 'manual', array['platinum_private'])
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  is_enabled = excluded.is_enabled,
  rollout_plan = excluded.rollout_plan,
  allowed_plan_ids = excluded.allowed_plan_ids,
  updated_at = now();

create table if not exists public.saas_support_tickets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid references public.workspaces(id) on delete set null,
  requester_id uuid references auth.users(id) on delete set null,
  requester_email text,
  title text not null,
  description text not null,
  area text not null default 'technical',
  priority text not null default 'medium',
  status text not null default 'open',
  assigned_admin_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint saas_support_tickets_area_check check (
    area in ('technical', 'feature', 'billing', 'guidance', 'account')
  ),
  constraint saas_support_tickets_priority_check check (priority in ('low', 'medium', 'high', 'urgent')),
  constraint saas_support_tickets_status_check check (status in ('open', 'waiting', 'resolved', 'closed'))
);

create index if not exists saas_support_tickets_status_idx
on public.saas_support_tickets(status, priority, updated_at desc);

create index if not exists saas_support_tickets_workspace_id_idx
on public.saas_support_tickets(workspace_id);

alter table public.admin_users enable row level security;
alter table public.saas_plans enable row level security;
alter table public.saas_subscriptions enable row level security;
alter table public.feature_flags enable row level security;
alter table public.saas_support_tickets enable row level security;

grant all on table public.admin_users to authenticated;
grant all on table public.saas_plans to authenticated;
grant all on table public.saas_subscriptions to authenticated;
grant all on table public.feature_flags to authenticated;
grant all on table public.saas_support_tickets to authenticated;

drop policy if exists "Admins can read own admin record" on public.admin_users;
drop policy if exists "Admins can manage admin records" on public.admin_users;
drop policy if exists "Admins can manage saas plans" on public.saas_plans;
drop policy if exists "Admins can manage saas subscriptions" on public.saas_subscriptions;
drop policy if exists "Users can read own subscription" on public.saas_subscriptions;
drop policy if exists "Admins can manage feature flags" on public.feature_flags;
drop policy if exists "Admins can manage support tickets" on public.saas_support_tickets;
drop policy if exists "Users can create support tickets" on public.saas_support_tickets;

create policy "Admins can read own admin record"
on public.admin_users
for select
using (user_id = auth.uid());

create policy "Admins can manage admin records"
on public.admin_users
for all
using (public.is_saas_admin())
with check (public.is_saas_admin());

create policy "Admins can manage saas plans"
on public.saas_plans
for all
using (public.is_saas_admin())
with check (public.is_saas_admin());

create policy "Admins can manage saas subscriptions"
on public.saas_subscriptions
for all
using (public.is_saas_admin())
with check (public.is_saas_admin());

create policy "Users can read own subscription"
on public.saas_subscriptions
for select
using (user_id = auth.uid());

create policy "Admins can manage feature flags"
on public.feature_flags
for all
using (public.is_saas_admin())
with check (public.is_saas_admin());

create policy "Admins can manage support tickets"
on public.saas_support_tickets
for all
using (public.is_saas_admin())
with check (public.is_saas_admin());

create policy "Users can create support tickets"
on public.saas_support_tickets
for insert
with check (requester_id = auth.uid());

drop policy if exists "Admins can read all workspaces" on public.workspaces;
drop policy if exists "Admins can read all profiles" on public.user_profiles;

create policy "Admins can read all workspaces"
on public.workspaces
for select
using (public.is_saas_admin());

create policy "Admins can read all profiles"
on public.user_profiles
for select
using (public.is_saas_admin());
