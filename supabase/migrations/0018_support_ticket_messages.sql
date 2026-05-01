create table if not exists public.saas_support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.saas_support_tickets(id) on delete cascade,
  workspace_id uuid references public.workspaces(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  author_role text not null default 'user',
  visibility text not null default 'public',
  body text not null,
  created_at timestamptz not null default now(),
  constraint saas_support_ticket_messages_author_role_check check (
    author_role in ('user', 'admin', 'system')
  ),
  constraint saas_support_ticket_messages_visibility_check check (
    visibility in ('public', 'internal')
  ),
  constraint saas_support_ticket_messages_body_check check (char_length(trim(body)) >= 2)
);

create index if not exists saas_support_ticket_messages_ticket_id_idx
on public.saas_support_ticket_messages(ticket_id, created_at asc);

create index if not exists saas_support_ticket_messages_workspace_id_idx
on public.saas_support_ticket_messages(workspace_id, created_at desc);

alter table public.saas_support_ticket_messages enable row level security;
grant select, insert on table public.saas_support_ticket_messages to authenticated;

drop policy if exists "Admins can manage support ticket messages" on public.saas_support_ticket_messages;
create policy "Admins can manage support ticket messages"
on public.saas_support_ticket_messages
for all
using (public.is_saas_admin())
with check (public.is_saas_admin());

drop policy if exists "Users can read own public support ticket messages" on public.saas_support_ticket_messages;
create policy "Users can read own public support ticket messages"
on public.saas_support_ticket_messages
for select
using (
  visibility = 'public'
  and exists (
    select 1
    from public.saas_support_tickets
    where saas_support_tickets.id = saas_support_ticket_messages.ticket_id
    and saas_support_tickets.requester_id = auth.uid()
  )
);

drop policy if exists "Users can create own public support ticket messages" on public.saas_support_ticket_messages;
create policy "Users can create own public support ticket messages"
on public.saas_support_ticket_messages
for insert
with check (
  visibility = 'public'
  and author_role = 'user'
  and author_id = auth.uid()
  and exists (
    select 1
    from public.saas_support_tickets
    where saas_support_tickets.id = saas_support_ticket_messages.ticket_id
    and saas_support_tickets.requester_id = auth.uid()
  )
);
