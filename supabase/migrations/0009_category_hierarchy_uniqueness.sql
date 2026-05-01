alter table public.categories
  drop constraint if exists categories_workspace_id_name_kind_key;

create unique index if not exists categories_workspace_parent_name_kind_idx
on public.categories (
  workspace_id,
  kind,
  name,
  coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
