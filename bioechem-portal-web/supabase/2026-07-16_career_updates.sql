-- Lets a participant record/update their career path, plan, or interests
-- for each cohort they're enrolled in — one entry per (cohort, participant),
-- editable any time, with an optional attached file (e.g. a career plan PDF).
-- Run this once in the Supabase SQL editor.

create table if not exists public.career_updates (
  id           uuid        primary key default gen_random_uuid(),
  cohort_id    uuid        not null references public.cohorts(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  content      text,                              -- free-text career path / interests
  file_url     text,                               -- optional attached file (course-files bucket, public)
  storage_path text,                               -- kept to allow removing the old file on replace/delete
  file_name    text,
  size_bytes   bigint,
  mime_type    text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (cohort_id, user_id)
);

create index if not exists career_updates_cohort_id_idx on public.career_updates(cohort_id);
create index if not exists career_updates_user_id_idx   on public.career_updates(user_id);

alter table public.career_updates enable row level security;

-- Participants manage their own entry
drop policy if exists "career_updates_own_read" on public.career_updates;
create policy "career_updates_own_read"
  on public.career_updates for select
  using (user_id = auth.uid());

drop policy if exists "career_updates_own_write" on public.career_updates;
create policy "career_updates_own_write"
  on public.career_updates for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Teachers/admins who can manage the cohort can read every participant's entry.
-- Reuses the same can_manage_cohort() helper already used for other cohort tables.
drop policy if exists "career_updates_manager_read" on public.career_updates;
create policy "career_updates_manager_read"
  on public.career_updates for select
  using (public.can_manage_cohort(cohort_id));
