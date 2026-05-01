create table if not exists public.user_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  username text unique,
  avatar_url text,
  avatar_path text,
  theme_id text not null default 'classic',
  font_id text not null default 'classic',
  density text not null default 'comfortable',
  ai_avatar_prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_profiles_username_check check (
    username is null or username ~ '^[a-z0-9_]{3,24}$'
  ),
  constraint user_profiles_theme_id_check check (
    theme_id in ('classic', 'atlantic', 'graphite', 'terracotta')
  ),
  constraint user_profiles_font_id_check check (
    font_id in ('classic', 'editorial', 'ledger', 'clean')
  ),
  constraint user_profiles_density_check check (
    density in ('comfortable', 'compact', 'spacious')
  )
);

alter table public.user_profiles enable row level security;

grant all on table public.user_profiles to authenticated;

drop policy if exists "Users can read own profile" on public.user_profiles;
drop policy if exists "Users can insert own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;

create policy "Users can read own profile"
on public.user_profiles
for select
using (user_id = auth.uid());

create policy "Users can insert own profile"
on public.user_profiles
for insert
with check (user_id = auth.uid());

create policy "Users can update own profile"
on public.user_profiles
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml']
)
on conflict (id) do nothing;

drop policy if exists "Profile avatars are publicly readable" on storage.objects;
drop policy if exists "Users can upload own profile avatars" on storage.objects;
drop policy if exists "Users can update own profile avatars" on storage.objects;
drop policy if exists "Users can delete own profile avatars" on storage.objects;

create policy "Profile avatars are publicly readable"
on storage.objects
for select
using (bucket_id = 'profile-avatars');

create policy "Users can upload own profile avatars"
on storage.objects
for insert
with check (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can update own profile avatars"
on storage.objects
for update
using (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
)
with check (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "Users can delete own profile avatars"
on storage.objects
for delete
using (
  bucket_id = 'profile-avatars'
  and auth.uid()::text = (storage.foldername(name))[1]
);
