create table if not exists public.system_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  language text not null default 'pt-BR',
  date_format text not null default 'dd/MM/yyyy',
  week_starts_on text not null default 'monday',
  keyboard_shortcuts_enabled boolean not null default true,
  command_palette_enabled boolean not null default true,
  quick_add_default text not null default 'transaction',
  enter_to_submit boolean not null default false,
  auto_categorize_imports boolean not null default true,
  compact_numbers boolean not null default false,
  in_app_notifications_enabled boolean not null default true,
  email_notifications_enabled boolean not null default false,
  due_bill_alerts_enabled boolean not null default true,
  low_balance_alerts_enabled boolean not null default true,
  budget_risk_alerts_enabled boolean not null default true,
  weekly_digest_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint system_preferences_user_workspace_unique unique (user_id, workspace_id),
  constraint system_preferences_language_check check (language in ('pt-BR', 'en-US', 'es-ES')),
  constraint system_preferences_date_format_check check (date_format in ('dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd')),
  constraint system_preferences_week_starts_on_check check (week_starts_on in ('sunday', 'monday')),
  constraint system_preferences_quick_add_default_check check (
    quick_add_default in ('transaction', 'bill', 'deposit', 'account')
  )
);

create index if not exists system_preferences_workspace_id_idx
on public.system_preferences(workspace_id);

alter table public.system_preferences enable row level security;

grant select, insert, update on table public.system_preferences to authenticated;

drop policy if exists "Users can read own system preferences" on public.system_preferences;
create policy "Users can read own system preferences"
on public.system_preferences
for select
using (
  user_id = auth.uid()
  or public.is_saas_admin()
);

drop policy if exists "Users can create own system preferences" on public.system_preferences;
create policy "Users can create own system preferences"
on public.system_preferences
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces
    where workspaces.id = system_preferences.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);

drop policy if exists "Users can update own system preferences" on public.system_preferences;
create policy "Users can update own system preferences"
on public.system_preferences
for update
using (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces
    where workspaces.id = system_preferences.workspace_id
    and workspaces.owner_id = auth.uid()
  )
)
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.workspaces
    where workspaces.id = system_preferences.workspace_id
    and workspaces.owner_id = auth.uid()
  )
);
