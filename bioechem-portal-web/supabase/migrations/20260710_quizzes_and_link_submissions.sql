-- ---------------------------------------------------------------------------
-- 1. Hyperlink submissions for assignments (in addition to text/file).
-- 2. New "quiz" content type: admin/teacher-authored question sets with
--    auto-graded multiple-choice/true-false and manually-graded short-answer.
-- Additive migration — run once against the Supabase project (SQL editor or
-- `psql "$CONNECTION_STRING" -f supabase/migrations/20260710_quizzes_and_link_submissions.sql`).
-- ---------------------------------------------------------------------------

-- ── Assignment hyperlink submissions ────────────────────────────────────────
alter table public.submissions add column if not exists link_url text;

-- ── Quiz content type ────────────────────────────────────────────────────────
alter table public.module_items drop constraint if exists module_items_type_check;
alter table public.module_items add constraint module_items_type_check
  check (type in ('note', 'assignment', 'file', 'link', 'quiz'));

create table public.quizzes (
  id             uuid primary key default gen_random_uuid(),
  module_item_id uuid not null unique references public.module_items(id) on delete cascade,
  cohort_id      uuid not null references public.cohorts(id) on delete cascade,
  instructions   text,
  due_at         timestamptz,
  questions      jsonb not null default '[]'::jsonb,
  max_points     numeric(6,2) not null default 0,
  created_by     uuid not null references public.profiles(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table public.quiz_submissions (
  id             uuid primary key default gen_random_uuid(),
  quiz_id        uuid not null references public.quizzes(id) on delete cascade,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  cohort_id      uuid not null references public.cohorts(id) on delete cascade,
  answers        jsonb not null default '{}'::jsonb,
  auto_score     numeric(6,2) not null default 0,
  manual_score   numeric(6,2),
  needs_grading  boolean not null default false,
  feedback       text,
  graded_by      uuid references public.profiles(id) on delete set null,
  graded_at      timestamptz,
  submitted_at   timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique(quiz_id, user_id)
);

create index quizzes_cohort_id_idx on public.quizzes(cohort_id);
create index quiz_submissions_quiz_id_idx on public.quiz_submissions(quiz_id);
create index quiz_submissions_user_id_idx on public.quiz_submissions(user_id);

alter table public.quizzes           enable row level security;
alter table public.quiz_submissions  enable row level security;

-- Mirrors assignments/submissions RLS exactly.
create policy "quizzes_enrolled_select" on public.quizzes
  for select to authenticated
  using (public.is_enrolled_in_cohort(cohort_id) or public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());
create policy "quizzes_teacher_write" on public.quizzes
  for insert to authenticated with check (public.can_manage_cohort(cohort_id));
create policy "quizzes_admin_all" on public.quizzes
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

create policy "quiz_submissions_select_own" on public.quiz_submissions
  for select to authenticated using (user_id = auth.uid());
create policy "quiz_submissions_teacher_select" on public.quiz_submissions
  for select to authenticated using (public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());
create policy "quiz_submissions_insert_own" on public.quiz_submissions
  for insert to authenticated with check (user_id = auth.uid() and public.is_enrolled_in_cohort(cohort_id));
create policy "quiz_submissions_update_own" on public.quiz_submissions
  for update to authenticated using (user_id = auth.uid());
create policy "quiz_submissions_teacher_grade" on public.quiz_submissions
  for update to authenticated using (public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());
create policy "quiz_submissions_admin_all" on public.quiz_submissions
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
