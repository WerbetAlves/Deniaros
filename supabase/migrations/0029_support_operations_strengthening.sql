alter table public.saas_support_tickets
drop constraint if exists saas_support_tickets_status_check;

alter table public.saas_support_tickets
add constraint saas_support_tickets_status_check check (
  status in ('open', 'in_progress', 'waiting', 'resolved', 'closed')
);

alter table public.saas_support_tickets
add column if not exists first_response_due_at timestamptz,
add column if not exists next_response_due_at timestamptz,
add column if not exists first_responded_at timestamptz,
add column if not exists resolved_at timestamptz,
add column if not exists status_reason text;

update public.saas_support_tickets
set
  first_response_due_at = coalesce(
    first_response_due_at,
    created_at + (
      case priority
        when 'urgent' then interval '4 hours'
        when 'high' then interval '12 hours'
        when 'low' then interval '48 hours'
        else interval '24 hours'
      end
    )
  ),
  next_response_due_at = coalesce(
    next_response_due_at,
    updated_at + (
      case priority
        when 'urgent' then interval '4 hours'
        when 'high' then interval '12 hours'
        when 'low' then interval '48 hours'
        else interval '24 hours'
      end
    )
  )
where first_response_due_at is null
or next_response_due_at is null;

create table if not exists public.saas_support_notifications (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references public.saas_support_tickets(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  audience text not null default 'user',
  kind text not null,
  title text not null,
  body text not null,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint saas_support_notifications_audience_check check (audience in ('user', 'admin')),
  constraint saas_support_notifications_kind_check check (
    kind in (
      'ticket_created',
      'admin_replied',
      'user_replied',
      'status_changed',
      'sla_warning',
      'sla_breached'
    )
  )
);

create index if not exists saas_support_notifications_user_id_idx
on public.saas_support_notifications(user_id, read_at, created_at desc);

create index if not exists saas_support_notifications_ticket_id_idx
on public.saas_support_notifications(ticket_id, created_at desc);

create index if not exists saas_support_notifications_workspace_id_idx
on public.saas_support_notifications(workspace_id, created_at desc);

alter table public.saas_support_notifications enable row level security;
grant select, insert, update on table public.saas_support_notifications to authenticated;

drop policy if exists "Admins can manage support notifications" on public.saas_support_notifications;
create policy "Admins can manage support notifications"
on public.saas_support_notifications
for all
using (public.is_saas_admin())
with check (public.is_saas_admin());

drop policy if exists "Users can read own support notifications" on public.saas_support_notifications;
create policy "Users can read own support notifications"
on public.saas_support_notifications
for select
using (user_id = auth.uid());

drop policy if exists "Users can update own support notifications" on public.saas_support_notifications;
create policy "Users can update own support notifications"
on public.saas_support_notifications
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can create own support notifications" on public.saas_support_notifications;
create policy "Users can create own support notifications"
on public.saas_support_notifications
for insert
with check (
  user_id = auth.uid()
  and audience = 'user'
);
