update public.saas_plans
set
  name = 'Bronze',
  limits = '{"workspaces":1,"accounts":2,"transactions":100,"ai_messages":10,"seats":1}'::jsonb,
  features = '{"agenda":true,"reports_basic":true,"imports":false,"open_finance":false,"support_priority":false}'::jsonb,
  updated_at = now()
where id = 'free';

update public.saas_plans
set
  name = 'Prata',
  limits = '{"workspaces":1,"accounts":20,"transactions":10000,"ai_messages":500,"seats":1}'::jsonb,
  features = '{"agenda":true,"reports_advanced":true,"imports":true,"open_finance":false,"support_priority":false}'::jsonb,
  updated_at = now()
where id = 'pro';

update public.saas_plans
set
  name = 'Ouro',
  limits = '{"workspaces":1,"accounts":60,"transactions":100000,"ai_messages":3000,"seats":1}'::jsonb,
  features = '{"agenda":true,"reports_advanced":true,"imports":true,"open_finance":true,"support_priority":true}'::jsonb,
  updated_at = now()
where id = 'business_lite';

update public.saas_plans
set
  name = 'Família',
  price_cents = 21900,
  limits = '{"workspaces":1,"accounts":120,"transactions":200000,"ai_messages":6000,"seats":2}'::jsonb,
  features = '{"agenda":true,"reports_advanced":true,"imports":true,"open_finance":true,"support_priority":true,"family_workspace":true,"joint_reports":true}'::jsonb,
  updated_at = now()
where id = 'family';
