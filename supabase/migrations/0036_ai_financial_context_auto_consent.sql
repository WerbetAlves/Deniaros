alter table if exists public.privacy_preferences
alter column allow_ai_financial_context set default true;

update public.privacy_preferences
set
  allow_ai_financial_context = true,
  updated_at = now()
where allow_ai_financial_context = false;
