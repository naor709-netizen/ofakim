-- =====================================================
-- Parent profiles table — for residents using Magic Link auth
-- =====================================================
-- Run this in Supabase SQL Editor.
-- Prerequisite: Email auth enabled in Supabase Dashboard.

create table if not exists public.parent_profiles (
  user_id        uuid primary key references auth.users(id) on delete cascade,
  family_name    text not null,
  neighborhood   text,
  children       jsonb not null default '[]'::jsonb,
  interests      text[] not null default '{}',
  notifications  jsonb not null default '{"whatsapp":true,"emailWeekly":true,"reminders":false}'::jsonb,
  email          text,
  phone          text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.tg_parent_profiles_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists parent_profiles_updated_at on public.parent_profiles;
create trigger parent_profiles_updated_at
  before update on public.parent_profiles
  for each row execute function public.tg_parent_profiles_updated_at();

-- =====================================================
-- Row-Level Security: each user reads/writes only their own row
-- =====================================================
alter table public.parent_profiles enable row level security;

drop policy if exists "parent_profiles_select_own" on public.parent_profiles;
create policy "parent_profiles_select_own"
  on public.parent_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "parent_profiles_insert_own" on public.parent_profiles;
create policy "parent_profiles_insert_own"
  on public.parent_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "parent_profiles_update_own" on public.parent_profiles;
create policy "parent_profiles_update_own"
  on public.parent_profiles for update
  using (auth.uid() = user_id);

drop policy if exists "parent_profiles_delete_own" on public.parent_profiles;
create policy "parent_profiles_delete_own"
  on public.parent_profiles for delete
  using (auth.uid() = user_id);
