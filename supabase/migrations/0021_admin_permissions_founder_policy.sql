create or replace function public.is_saas_founder()
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
    and admin_users.role = 'founder'
  );
$$;

grant execute on function public.is_saas_founder() to authenticated;

drop policy if exists "Admins can manage admin records" on public.admin_users;
drop policy if exists "Founders can manage admin records" on public.admin_users;

create policy "Founders can manage admin records"
on public.admin_users
for all
using (public.is_saas_founder())
with check (public.is_saas_founder());
