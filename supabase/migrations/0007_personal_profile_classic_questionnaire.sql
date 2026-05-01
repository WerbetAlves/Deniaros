alter table public.personal_profiles
add column if not exists classic_answers jsonb not null default '{}'::jsonb;

update public.personal_profiles
set classic_answers = '{}'::jsonb
where classic_answers is null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'personal_profiles_classic_answers_object_check'
  ) then
    alter table public.personal_profiles
    add constraint personal_profiles_classic_answers_object_check
    check (jsonb_typeof(classic_answers) = 'object');
  end if;
end $$;
