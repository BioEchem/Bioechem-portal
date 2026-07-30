-- =============================================================================
-- BioEchem Partner Portal — FULL SCHEMA (consolidated)
--
-- Paste this entire file into Supabase Dashboard → SQL Editor → Run.
-- Safe to re-run on a fresh project: drops and recreates all portal tables,
-- functions, policies, and storage buckets.
--
-- Last updated: includes all features through shareholder/partner nested
-- folders, career updates, credits page content, and partner/shareholder
-- announcements.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- RESET — drop everything in dependency order
-- ---------------------------------------------------------------------------

drop trigger  if exists on_auth_user_created           on auth.users;
drop trigger  if exists profiles_validate_cohort_school on public.profiles;

-- New feature tables
drop table if exists public.notifications          cascade;
drop table if exists public.point_transactions     cascade;
drop table if exists public.credits_page_content   cascade;
drop table if exists public.shareholder_announcements cascade;
drop table if exists public.partner_announcements  cascade;
drop table if exists public.shareholder_documents  cascade;
drop table if exists public.shareholder_folders    cascade;
drop table if exists public.partner_documents      cascade;
drop table if exists public.partner_folders        cascade;
drop table if exists public.partner_events         cascade;
drop table if exists public.partner_programs       cascade;
drop table if exists public.job_applications       cascade;
drop table if exists public.job_postings           cascade;
drop table if exists public.career_updates         cascade;
drop table if exists public.cohort_feedback        cascade;

-- LMS tables
drop table if exists public.cohort_contacts        cascade;
drop table if exists public.grades                 cascade;
drop table if exists public.quiz_submissions       cascade;
drop table if exists public.quizzes                cascade;
drop table if exists public.submissions            cascade;
drop table if exists public.assignments            cascade;
drop table if exists public.module_items           cascade;
drop table if exists public.modules                cascade;
drop table if exists public.announcements          cascade;
drop table if exists public.cohort_enrollments     cascade;
drop table if exists public.cohort_contacts        cascade;
drop table if exists public.certificates           cascade;

-- Survey / messaging tables
drop table if exists public.survey_responses       cascade;
drop table if exists public.surveys                cascade;
drop table if exists public.messages               cascade;
drop table if exists public.conversations          cascade;

-- Classroom
drop table if exists public.session_recordings     cascade;
drop table if exists public.class_sessions         cascade;

-- CMS tables
drop table if exists public.event_images           cascade;
drop table if exists public.past_events            cascade;
drop table if exists public.upcoming_events        cascade;
drop table if exists public.newsletters            cascade;

-- Drive
drop table if exists public.drive_items            cascade;

-- Profile sub-tables
drop table if exists public.profile_emergency_contacts cascade;
drop table if exists public.profile_work_experience    cascade;
drop table if exists public.profile_education          cascade;
drop table if exists public.profile_addresses          cascade;
drop table if exists public.user_resumes               cascade;

-- Core tables
drop table if exists public.profiles               cascade;
drop table if exists public.cohorts                cascade;
drop table if exists public.schools                cascade;

-- Functions
drop function if exists public.is_teacher_in_cohort(uuid)         cascade;
drop function if exists public.is_enrolled_in_cohort(uuid)        cascade;
drop function if exists public.can_manage_cohort(uuid)            cascade;
drop function if exists public.handle_new_user()                  cascade;
drop function if exists public.validate_profile_cohort_school()   cascade;
drop function if exists public.current_user_school_id()           cascade;
drop function if exists public.is_school_admin()                  cascade;
drop function if exists public.is_bioechem_admin()                cascade;
drop function if exists public.is_approved()                      cascade;

-- Storage policies
drop policy if exists avatars_public_read          on storage.objects;
drop policy if exists avatars_user_insert          on storage.objects;
drop policy if exists avatars_user_update          on storage.objects;
drop policy if exists avatars_user_delete          on storage.objects;
drop policy if exists resumes_public_read          on storage.objects;
drop policy if exists resumes_user_select          on storage.objects;
drop policy if exists resumes_user_insert          on storage.objects;
drop policy if exists resumes_user_update          on storage.objects;
drop policy if exists resumes_user_delete          on storage.objects;
drop policy if exists course_files_public_read     on storage.objects;
drop policy if exists course_files_auth_insert     on storage.objects;
drop policy if exists course_files_auth_update     on storage.objects;
drop policy if exists course_files_auth_delete     on storage.objects;
drop policy if exists newsletter_files_read        on storage.objects;
drop policy if exists newsletter_files_insert      on storage.objects;
drop policy if exists newsletter_files_delete      on storage.objects;
drop policy if exists newsletter_videos_read       on storage.objects;
drop policy if exists newsletter_videos_insert     on storage.objects;
drop policy if exists newsletter_videos_delete     on storage.objects;
drop policy if exists event_photos_read            on storage.objects;
drop policy if exists event_photos_insert          on storage.objects;
drop policy if exists event_photos_delete          on storage.objects;
drop policy if exists certificates_public_read     on storage.objects;
drop policy if exists certificates_admin_insert    on storage.objects;
drop policy if exists certificates_admin_delete    on storage.objects;
drop policy if exists sharedocs_storage_insert     on storage.objects;
drop policy if exists sharedocs_storage_select     on storage.objects;
drop policy if exists sharedocs_storage_delete     on storage.objects;

-- Enums
drop type if exists public.survey_type     cascade;
drop type if exists public.survey_status   cascade;
drop type if exists public.approval_status cascade;
drop type if exists public.user_role       cascade;

-- ---------------------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------------------

create type public.user_role as enum (
  'participant',
  'teacher',
  'school_admin',
  'industry_partner',
  'shareholder',
  'bioechem_admin'
);

create type public.approval_status as enum (
  'pending',
  'approved',
  'rejected'
);

create type public.survey_type   as enum ('halfway', 'final', 'custom');
create type public.survey_status as enum ('draft', 'active', 'closed');

-- ---------------------------------------------------------------------------
-- SCHOOLS
-- ---------------------------------------------------------------------------

create table public.schools (
  id            uuid    primary key default gen_random_uuid(),
  name          text    not null,
  slug          text    unique,
  description   text,
  city          text,
  state         text,
  country       text,
  website       text,
  contact_name  text,
  contact_email text,
  contact_phone text,
  contact_title text,
  is_partner    boolean not null default true,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- COHORTS
-- ---------------------------------------------------------------------------

create table public.cohorts (
  id                           uuid    primary key default gen_random_uuid(),
  school_id                    uuid    references public.schools(id) on delete cascade,
  name                         text    not null,
  description                  text,
  start_date                   date,
  end_date                     date,
  max_enrollment               int,
  enrollment_requires_approval boolean not null default false,
  status                       text    not null default 'active'
                                 check (status in ('draft','active','archived')),
  is_active                    boolean not null default true,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

create index cohorts_school_id_idx on public.cohorts(school_id);
create index cohorts_status_idx    on public.cohorts(status);

-- ---------------------------------------------------------------------------
-- COHORT CONTACTS
-- ---------------------------------------------------------------------------

create table public.cohort_contacts (
  id         uuid        primary key default gen_random_uuid(),
  cohort_id  uuid        not null references public.cohorts(id) on delete cascade,
  name       text        not null,
  email      text        not null,
  title      text,
  position   int         not null default 0,
  created_at timestamptz not null default now()
);

create index cohort_contacts_cohort_id_idx on public.cohort_contacts(cohort_id);

-- ---------------------------------------------------------------------------
-- PROFILES (core user record — address data lives in profile_addresses)
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  email                     text,
  full_name                 text,
  first_name                text,
  last_name                 text,
  middle_name               text,
  phone                     text,
  gender                    text,
  avatar_url                text,
  bio                       text,
  grade                     text,
  resume_url                text,
  age                       smallint,
  interested_in_internship  boolean not null default false,
  role                      public.user_role    not null default 'participant',
  partner_type              text check (partner_type in ('industry', 'government')),
  school_id                 uuid references public.schools(id),
  other_school_name         text,
  cohort_id                 uuid references public.cohorts(id),
  approval_status           public.approval_status not null default 'pending',
  approved_at               timestamptz,
  approved_by               uuid references public.profiles(id),
  rejection_reason          text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index profiles_approval_status_idx on public.profiles(approval_status);
create index profiles_school_id_idx       on public.profiles(school_id);

-- ---------------------------------------------------------------------------
-- PROFILE SUB-TABLES
-- ---------------------------------------------------------------------------

create table public.profile_addresses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null unique references public.profiles(id) on delete cascade,
  street         text,
  apt            text,
  city           text,
  state          text,
  country        text,
  zip            text,
  reg_state      text,
  school_country text,
  updated_at     timestamptz not null default now()
);

create table public.profile_education (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  institution    text not null,
  degree         text,
  field_of_study text,
  start_year     text,
  end_year       text,
  is_current     boolean not null default false,
  position       int not null default 0,
  created_at     timestamptz not null default now()
);

create table public.profile_work_experience (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  company     text not null,
  title       text,
  type        text,
  start_month text,
  start_year  text,
  end_month   text,
  end_year    text,
  is_current  boolean not null default false,
  description text,
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

create table public.profile_emergency_contacts (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  name         text not null,
  phone        text not null,
  relationship text not null default '',
  position     int not null default 0,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- DRIVE (admin file storage — after profiles so the FK resolves)
-- ---------------------------------------------------------------------------

create table public.drive_items (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  type         text        not null check (type in ('folder', 'file')),
  parent_id    uuid        references public.drive_items(id) on delete cascade,
  storage_path text,
  file_url     text,
  mime_type    text,
  size_bytes   bigint,
  created_by   uuid        not null references public.profiles(id) on delete restrict,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index drive_items_parent_id_idx  on public.drive_items(parent_id);
create index drive_items_created_by_idx on public.drive_items(created_by);

-- ---------------------------------------------------------------------------
-- PROFILE TRIGGER: validate cohort belongs to school
-- ---------------------------------------------------------------------------

create or replace function public.validate_profile_cohort_school()
returns trigger language plpgsql as $$
begin
  if new.cohort_id is null then return new; end if;
  if new.school_id is null then
    raise exception 'school_id is required when cohort_id is set';
  end if;
  if exists (
    select 1 from public.cohorts c
    where c.id = new.cohort_id
      and c.school_id is not null
      and c.school_id != new.school_id
  ) then
    raise exception 'cohort does not belong to the selected school';
  end if;
  return new;
end;
$$;

create trigger profiles_validate_cohort_school
  before insert or update of school_id, cohort_id on public.profiles
  for each row execute function public.validate_profile_cohort_school();

-- ---------------------------------------------------------------------------
-- SIGNUP TRIGGER: auth.users → profiles
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_school_id          uuid;
  v_cohort_id          uuid;
  v_role               public.user_role;
  v_age                smallint;
  v_other_school_name  text;
  v_first_name         text;
  v_last_name          text;
  v_middle_name        text;
  v_full_name          text;
begin
  v_school_id         := nullif(new.raw_user_meta_data->>'school_id','')::uuid;
  v_cohort_id         := nullif(new.raw_user_meta_data->>'cohort_id','')::uuid;
  v_other_school_name := nullif(trim(new.raw_user_meta_data->>'other_school_name'),'');
  v_role := coalesce(
    (new.raw_user_meta_data->>'role')::public.user_role,
    'participant'::public.user_role
  );

  if v_role in ('bioechem_admin','industry_partner','shareholder') then
    v_school_id         := null;
    v_cohort_id         := null;
    v_other_school_name := null;
  else
    if v_other_school_name is not null then
      v_school_id := null;
      v_cohort_id := null;
    elsif v_school_id is null then
      raise exception 'school_id or other_school_name is required';
    else
      if not exists (
        select 1 from public.schools s
        where s.id = v_school_id and s.is_partner and s.is_active
      ) then
        raise exception 'Invalid or inactive partner school';
      end if;

      if v_role = 'school_admin' then
        v_cohort_id := null;
      elsif v_cohort_id is not null and not exists (
        select 1 from public.cohorts c
        where c.id = v_cohort_id
          and c.school_id = v_school_id
          and c.is_active
      ) then
        raise exception 'Invalid cohort for school';
      end if;
    end if;
  end if;

  if v_role = 'participant' then
    v_age := nullif(new.raw_user_meta_data->>'age','')::smallint;
    if v_age is null then raise exception 'age is required for participants'; end if;
  end if;

  v_first_name := nullif(trim(new.raw_user_meta_data->>'first_name'),'');
  v_last_name  := nullif(trim(new.raw_user_meta_data->>'last_name'),'');
  v_middle_name:= nullif(trim(new.raw_user_meta_data->>'middle_name'),'');
  v_full_name  := trim(concat_ws(' ', v_first_name, v_middle_name, v_last_name));
  if v_full_name = '' then
    v_full_name := nullif(trim(new.raw_user_meta_data->>'full_name'),'');
  end if;

  insert into public.profiles (
    id, email, full_name, first_name, last_name, middle_name, phone,
    age, role, school_id, other_school_name, cohort_id, approval_status
  ) values (
    new.id, new.email,
    coalesce(v_full_name,''),
    v_first_name, v_last_name, v_middle_name,
    nullif(trim(new.raw_user_meta_data->>'phone'),''),
    v_age, v_role, v_school_id, v_other_school_name, v_cohort_id, 'pending'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RESUME HISTORY
-- ---------------------------------------------------------------------------

create table public.user_resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  url         text not null,
  filename    text,
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- COHORT ENROLLMENTS
-- ---------------------------------------------------------------------------

create table public.cohort_enrollments (
  id               uuid primary key default gen_random_uuid(),
  cohort_id        uuid not null references public.cohorts(id) on delete cascade,
  user_id          uuid not null references public.profiles(id) on delete cascade,
  role             text not null default 'participant'
                     check (role in ('participant','teacher')),
  status           text not null default 'pending'
                     check (status in ('pending','approved','rejected','dropped')),
  enrolled_at      timestamptz not null default now(),
  reviewed_at      timestamptz,
  reviewed_by      uuid references public.profiles(id),
  rejection_reason text,
  unique(cohort_id, user_id)
);

create index enrollments_cohort_id_idx on public.cohort_enrollments(cohort_id);
create index enrollments_user_id_idx   on public.cohort_enrollments(user_id);
create index enrollments_status_idx    on public.cohort_enrollments(status);

-- ---------------------------------------------------------------------------
-- CAREER UPDATES (participant career path/interests per cohort)
-- ---------------------------------------------------------------------------

create table public.career_updates (
  id           uuid        primary key default gen_random_uuid(),
  cohort_id    uuid        not null references public.cohorts(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  content      text,
  file_url     text,
  storage_path text,
  file_name    text,
  size_bytes   bigint,
  mime_type    text,
  admin_comment text,
  commented_by  uuid references public.profiles(id) on delete set null,
  commented_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (cohort_id, user_id)
);

create index career_updates_cohort_id_idx on public.career_updates(cohort_id);
create index career_updates_user_id_idx   on public.career_updates(user_id);

-- ---------------------------------------------------------------------------
-- COHORT FEEDBACK (participant rating + comment, separate from surveys)
-- ---------------------------------------------------------------------------

create table public.cohort_feedback (
  id         uuid        primary key default gen_random_uuid(),
  cohort_id  uuid        not null references public.cohorts(id) on delete cascade,
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  rating     smallint    not null check (rating between 1 and 5),
  comment    text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (cohort_id, user_id)
);

create index cohort_feedback_cohort_id_idx on public.cohort_feedback(cohort_id);
create index cohort_feedback_user_id_idx   on public.cohort_feedback(user_id);

-- ---------------------------------------------------------------------------
-- LMS: MODULES
-- ---------------------------------------------------------------------------

create table public.modules (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid not null references public.cohorts(id) on delete cascade,
  title       text not null,
  description text,
  position    int  not null default 0,
  published   boolean not null default false,
  publish_at  timestamptz,
  created_by  uuid not null references public.profiles(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index modules_cohort_id_idx on public.modules(cohort_id);

-- ---------------------------------------------------------------------------
-- LMS: MODULE ITEMS
-- ---------------------------------------------------------------------------

create table public.module_items (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.modules(id) on delete cascade,
  cohort_id    uuid not null references public.cohorts(id) on delete cascade,
  type         text not null check (type in ('note','assignment','file','link','quiz')),
  title        text not null,
  content      text,
  file_url     text,
  external_url text,
  position     int  not null default 0,
  published    boolean not null default false,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index module_items_module_id_idx on public.module_items(module_id);
create index module_items_cohort_id_idx on public.module_items(cohort_id);

-- ---------------------------------------------------------------------------
-- LMS: ASSIGNMENTS
-- ---------------------------------------------------------------------------

create table public.assignments (
  id              uuid primary key default gen_random_uuid(),
  module_item_id  uuid not null unique references public.module_items(id) on delete cascade,
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  due_at            timestamptz,
  max_points        int,
  requires_grading  boolean not null default true,
  grade_category    text not null default 'intermediate'
                      check (grade_category in ('intermediate', 'final')),
  assignment_type   text not null default 'assignment'
                      check (assignment_type in ('assignment', 'presentation', 'field_trip', 'quiz', 'other')),
  submission_type   text not null default 'any'
                      check (submission_type in ('file','text','any')),
  instructions      text,
  published         boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index assignments_cohort_id_idx on public.assignments(cohort_id);

-- ---------------------------------------------------------------------------
-- LMS: SUBMISSIONS
-- ---------------------------------------------------------------------------

create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  submission_text text,
  file_url        text,
  link_url        text,
  filename        text,
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(assignment_id, user_id)
);

create index submissions_assignment_id_idx on public.submissions(assignment_id);
create index submissions_user_id_idx       on public.submissions(user_id);

-- ---------------------------------------------------------------------------
-- LMS: QUIZZES
-- ---------------------------------------------------------------------------

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

-- ---------------------------------------------------------------------------
-- LMS: GRADES
-- ---------------------------------------------------------------------------

create table public.grades (
  id            uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references public.submissions(id) on delete cascade,
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  cohort_id     uuid not null references public.cohorts(id) on delete cascade,
  graded_by     uuid not null references public.profiles(id),
  points_earned numeric(6,2),
  feedback      text,
  graded_at     timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index grades_cohort_id_idx on public.grades(cohort_id);
create index grades_user_id_idx   on public.grades(user_id);

-- ---------------------------------------------------------------------------
-- LMS: ANNOUNCEMENTS (with role visibility)
-- ---------------------------------------------------------------------------

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  cohort_id  uuid not null references public.cohorts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id),
  title      text not null,
  body       text not null,
  is_pinned  boolean not null default false,
  published  boolean not null default true,
  visible_to text[]  not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_cohort_id_idx on public.announcements(cohort_id);

-- ---------------------------------------------------------------------------
-- CERTIFICATES
-- ---------------------------------------------------------------------------

create table public.certificates (
  id           uuid        primary key default gen_random_uuid(),
  cohort_id    uuid        not null references public.cohorts(id) on delete cascade,
  user_id      uuid        not null references auth.users(id) on delete cascade,
  title        text        not null,
  file_url     text        not null,
  filename     text,
  uploaded_by  uuid        references auth.users(id) on delete set null,
  uploaded_at  timestamptz not null default now()
);

create index certificates_cohort_id_idx on public.certificates(cohort_id);
create index certificates_user_id_idx   on public.certificates(user_id);

-- ---------------------------------------------------------------------------
-- SURVEYS
-- ---------------------------------------------------------------------------

create table public.surveys (
  id          uuid        primary key default gen_random_uuid(),
  cohort_id   uuid        references public.cohorts(id) on delete cascade,
  title       text        not null,
  description text,
  type        public.survey_type   not null default 'custom',
  status      public.survey_status not null default 'draft',
  questions   jsonb       not null default '[]'::jsonb,
  created_by  uuid        references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index surveys_cohort_id_idx on public.surveys(cohort_id);
create index surveys_status_idx    on public.surveys(status);

create table public.survey_responses (
  id           uuid        primary key default gen_random_uuid(),
  survey_id    uuid        not null references public.surveys(id) on delete cascade,
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  answers      jsonb       not null default '{}'::jsonb,
  submitted_at timestamptz not null default now(),
  unique(survey_id, user_id)
);

create index survey_responses_survey_id_idx on public.survey_responses(survey_id);
create index survey_responses_user_id_idx   on public.survey_responses(user_id);

-- ---------------------------------------------------------------------------
-- MESSAGING
-- ---------------------------------------------------------------------------

create table public.conversations (
  id               uuid        primary key default gen_random_uuid(),
  user_id          uuid        not null unique references public.profiles(id) on delete cascade,
  last_message_at  timestamptz,
  unread_by_admin  boolean     not null default false,
  unread_by_user   boolean     not null default false,
  handled_by       uuid        references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);

create index conversations_user_id_idx      on public.conversations(user_id);
create index conversations_last_message_idx on public.conversations(last_message_at desc);

create table public.messages (
  id              uuid        primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations(id) on delete cascade,
  sender_id       uuid        not null references public.profiles(id) on delete cascade,
  body            text        not null check (char_length(body) > 0),
  sent_at         timestamptz not null default now()
);

create index messages_conversation_id_idx on public.messages(conversation_id);
create index messages_sent_at_idx         on public.messages(sent_at);

-- ---------------------------------------------------------------------------
-- GOOGLE OAUTH TOKENS (service-role only — no RLS select for users)
create table if not exists public.user_google_tokens (
  user_id       uuid        primary key references auth.users(id) on delete cascade,
  access_token  text,
  refresh_token text,
  token_expiry  timestamptz,
  updated_at    timestamptz not null default now()
);
alter table public.user_google_tokens enable row level security;

-- ---------------------------------------------------------------------------
-- ONLINE CLASSROOM — sessions & recordings
-- ---------------------------------------------------------------------------

create table public.class_sessions (
  id               uuid        primary key default gen_random_uuid(),
  cohort_id        uuid        not null references public.cohorts(id) on delete cascade,
  title            text        not null,
  description      text,
  scheduled_at     timestamptz not null,
  duration_minutes int         not null default 60,
  meeting_url      text,
  status           text        not null default 'scheduled'
                   check (status in ('scheduled','live','ended')),
  created_by       uuid        references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.class_sessions enable row level security;

create table public.session_recordings (
  id            uuid        primary key default gen_random_uuid(),
  cohort_id     uuid        not null references public.cohorts(id) on delete cascade,
  session_id    uuid        references public.class_sessions(id) on delete set null,
  title         text        not null,
  description   text,
  video_url     text,
  file_path     text,
  thumbnail_url text,
  published     boolean     not null default false,
  created_by    uuid        references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.session_recordings enable row level security;

-- ---------------------------------------------------------------------------
-- LANDING PAGE CMS — newsletters & past events
-- ---------------------------------------------------------------------------

create table public.newsletters (
  id          uuid primary key default gen_random_uuid(),
  title       text    not null,
  date        date    not null,
  excerpt     text    not null,
  body        text,
  pdf_url     text,
  video_url   text,
  published   boolean not null default false,
  position    int     not null default 0,
  visible_to  text[]  not null default '{}',
  created_by  uuid    references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.past_events (
  id          uuid primary key default gen_random_uuid(),
  title       text    not null,
  date        date    not null,
  location    text    not null,
  description text    not null,
  highlights  text[]  not null default '{}',
  link        text,
  published   boolean not null default false,
  position    int     not null default 0,
  created_by  uuid    references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.upcoming_events (
  id          uuid primary key default gen_random_uuid(),
  title       text    not null,
  date        date    not null,
  location    text    not null,
  description text    not null,
  link        text,
  published   boolean not null default false,
  position    int     not null default 0,
  created_by  uuid    references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.upcoming_events enable row level security;

create table public.event_images (
  id         uuid        primary key default gen_random_uuid(),
  event_id   uuid        not null references public.past_events(id) on delete cascade,
  url        text        not null,
  filename   text        not null default '',
  position   int         not null default 0,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- JOB POSTINGS & APPLICATIONS
-- ---------------------------------------------------------------------------

create table public.job_postings (
  id           uuid primary key default gen_random_uuid(),
  title        text    not null,
  company      text    not null,
  location     text,
  type         text    not null default 'full-time',
  description  text    not null,
  requirements text,
  deadline     date,
  visible_to   text[]  not null default '{}',
  published    boolean not null default false,
  created_by   uuid    references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table public.job_applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.job_postings(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  cover_letter text,
  status       text not null default 'pending',
  admin_notes  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (job_id, user_id)
);

-- ---------------------------------------------------------------------------
-- SHAREHOLDER FOLDERS + DOCUMENTS
-- ---------------------------------------------------------------------------

create table public.shareholder_folders (
  id               uuid        primary key default gen_random_uuid(),
  shareholder_id   uuid        not null references public.profiles(id) on delete cascade,
  parent_folder_id uuid        references public.shareholder_folders(id) on delete cascade,
  name             text        not null,
  created_by       uuid        references public.profiles(id),
  created_at       timestamptz not null default now()
);

create index shareholder_folders_shareholder_id_idx   on public.shareholder_folders(shareholder_id);
create index shareholder_folders_parent_folder_id_idx on public.shareholder_folders(parent_folder_id);

create table public.shareholder_documents (
  id             uuid primary key default gen_random_uuid(),
  title          text    not null,
  description    text,
  category       text    not null default 'general'
                   check (category in (
                     'general', 'report', 'financial', 'meeting', 'governance',
                     'meeting_followup', 'contract', 'invoice',
                     'payment_proof', 'grant_app', 'other'
                   )),
  file_url       text,
  storage_path   text,
  file_name      text,
  size_bytes     bigint,
  mime_type      text,
  published      boolean not null default true,
  shared_with    uuid[],
  shareholder_id uuid    references public.profiles(id) on delete cascade,
  folder_id      uuid    references public.shareholder_folders(id) on delete set null,
  created_by     uuid    references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index shareholder_documents_shared_with_idx   on public.shareholder_documents using gin (shared_with);
create index shareholder_documents_shareholder_id_idx on public.shareholder_documents(shareholder_id);
create index shareholder_documents_folder_id_idx      on public.shareholder_documents(folder_id);

-- ── Industry partner content (folders, documents, events) ───────────────────
create table public.partner_folders (
  id               uuid        primary key default gen_random_uuid(),
  partner_id       uuid        not null references public.profiles(id) on delete cascade,
  parent_folder_id uuid        references public.partner_folders(id) on delete cascade,
  name             text        not null,
  created_by       uuid        references public.profiles(id),
  created_at       timestamptz not null default now()
);

create index partner_folders_partner_id_idx       on public.partner_folders(partner_id);
create index partner_folders_parent_folder_id_idx on public.partner_folders(parent_folder_id);

create table public.partner_documents (
  id           uuid primary key default gen_random_uuid(),
  title        text    not null,
  description  text,
  category     text    not null default 'general'
                 check (category in (
                   'general', 'report', 'impact',
                   'meeting_followup', 'contract', 'invoice',
                   'payment_proof', 'grant_app', 'other'
                 )),
  file_url     text,
  storage_path text,
  file_name    text,
  size_bytes   bigint,
  mime_type    text,
  published    boolean not null default true,
  partner_id   uuid    references public.profiles(id) on delete cascade,
  folder_id    uuid    references public.partner_folders(id) on delete set null,
  created_by   uuid    references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index partner_documents_partner_id_idx on public.partner_documents(partner_id);
create index partner_documents_folder_id_idx  on public.partner_documents(folder_id);

create table public.partner_events (
  id                uuid primary key default gen_random_uuid(),
  title             text    not null,
  description       text,
  event_date        date,
  location          text,
  link              text,
  published         boolean not null default true,
  position          integer not null default 0,
  target            text    not null default 'all' check (target in ('all', 'industry', 'government', 'specific')),
  target_partner_id uuid    references public.profiles(id) on delete cascade,
  created_by        uuid    references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index partner_events_target_partner_id_idx on public.partner_events(target_partner_id);

-- ── Partner / shareholder announcements (message + optional file) ──────────
create table public.partner_announcements (
  id                uuid        primary key default gen_random_uuid(),
  title             text        not null,
  body              text        not null,
  target            text        not null check (target in ('all', 'industry', 'government', 'specific')),
  target_partner_id uuid        references public.profiles(id) on delete cascade,
  storage_path      text,
  file_name         text,
  size_bytes        bigint,
  mime_type         text,
  created_by        uuid        not null references public.profiles(id),
  created_at        timestamptz not null default now()
);

create index partner_announcements_target_partner_id_idx on public.partner_announcements(target_partner_id);

create table public.shareholder_announcements (
  id                     uuid        primary key default gen_random_uuid(),
  title                  text        not null,
  body                   text        not null,
  target                 text        not null check (target in ('all', 'specific')),
  target_shareholder_ids uuid[],
  storage_path           text,
  file_name              text,
  size_bytes             bigint,
  mime_type              text,
  created_by             uuid        not null references public.profiles(id),
  created_at             timestamptz not null default now()
);

-- ── Credits page content (single-row, admin-editable) ───────────────────────
create table public.credits_page_content (
  id          uuid        primary key default gen_random_uuid(),
  intro_text  text        not null,
  claim_text  text        not null,
  actions     jsonb       not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- REWARD POINTS
-- ---------------------------------------------------------------------------

create table public.point_transactions (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  cohort_id    uuid        references public.cohorts(id) on delete set null,
  source       text        not null check (source in ('grade', 'completion', 'manual')),
  reference_id text,
  points       integer     not null,
  note         text,
  awarded_by   uuid        references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create unique index point_transactions_grade_ref
  on public.point_transactions (user_id, reference_id)
  where source = 'grade';

create unique index point_transactions_completion_ref
  on public.point_transactions (user_id, cohort_id)
  where source = 'completion';

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS
-- ---------------------------------------------------------------------------

create table public.notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references public.profiles(id) on delete cascade,
  type       text        not null check (type in ('grade', 'certificate', 'job_application', 'announcement', 'general')),
  title      text        not null,
  body       text,
  link       text,
  read       boolean     not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications(user_id);
create index notifications_read_idx    on public.notifications(user_id, read) where read = false;

-- ---------------------------------------------------------------------------
-- RLS HELPER FUNCTIONS
-- ---------------------------------------------------------------------------

create or replace function public.is_approved()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.approval_status = 'approved'
  );
$$;

create or replace function public.is_bioechem_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'bioechem_admin' and p.approval_status = 'approved'
  );
$$;

create or replace function public.is_school_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'school_admin' and p.approval_status = 'approved'
      and p.school_id is not null
  );
$$;

create or replace function public.current_user_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select p.school_id from public.profiles p
  where p.id = auth.uid() and p.approval_status = 'approved'
  limit 1;
$$;

create or replace function public.is_teacher_in_cohort(p_cohort_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cohort_enrollments e
    where e.cohort_id = p_cohort_id
      and e.user_id   = auth.uid()
      and e.role      = 'teacher'
      and e.status    = 'approved'
  );
$$;

create or replace function public.is_enrolled_in_cohort(p_cohort_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cohort_enrollments e
    where e.cohort_id = p_cohort_id
      and e.user_id   = auth.uid()
      and e.status    = 'approved'
  );
$$;

create or replace function public.can_manage_cohort(p_cohort_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.is_bioechem_admin()
    or (
      public.is_school_admin()
      and exists (
        select 1 from public.cohorts c
        where c.id = p_cohort_id and c.school_id = public.current_user_school_id()
      )
    )
    or public.is_teacher_in_cohort(p_cohort_id);
$$;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — enable
-- ---------------------------------------------------------------------------

alter table public.cohort_contacts            enable row level security;
alter table public.schools                    enable row level security;
alter table public.cohorts                    enable row level security;
alter table public.profiles                   enable row level security;
alter table public.profile_addresses          enable row level security;
alter table public.profile_education          enable row level security;
alter table public.profile_work_experience    enable row level security;
alter table public.profile_emergency_contacts enable row level security;
alter table public.user_resumes               enable row level security;
alter table public.cohort_enrollments         enable row level security;
alter table public.modules                    enable row level security;
alter table public.module_items               enable row level security;
alter table public.assignments                enable row level security;
alter table public.submissions                enable row level security;
alter table public.quizzes                    enable row level security;
alter table public.quiz_submissions            enable row level security;
alter table public.grades                     enable row level security;
alter table public.announcements              enable row level security;
alter table public.certificates               enable row level security;
alter table public.surveys                    enable row level security;
alter table public.survey_responses           enable row level security;
alter table public.conversations              enable row level security;
alter table public.messages                   enable row level security;
alter table public.newsletters                enable row level security;
alter table public.past_events                enable row level security;
alter table public.upcoming_events            enable row level security;
alter table public.event_images               enable row level security;
alter table public.drive_items                enable row level security;
alter table public.job_postings               enable row level security;
alter table public.job_applications           enable row level security;
alter table public.shareholder_documents      enable row level security;
alter table public.shareholder_folders        enable row level security;
alter table public.partner_documents          enable row level security;
alter table public.partner_folders            enable row level security;
alter table public.partner_events             enable row level security;
alter table public.partner_announcements      enable row level security;
alter table public.shareholder_announcements  enable row level security;
alter table public.credits_page_content       enable row level security;
alter table public.career_updates             enable row level security;
alter table public.cohort_feedback            enable row level security;
alter table public.point_transactions         enable row level security;
alter table public.notifications              enable row level security;

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY — policies
-- ---------------------------------------------------------------------------

-- ── Cohort contacts ────────────────────────────────────────────────────────
create policy "cohort_contacts_enrolled_select" on public.cohort_contacts
  for select to authenticated
  using (public.is_enrolled_in_cohort(cohort_id) or public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());
create policy "cohort_contacts_admin_all" on public.cohort_contacts
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Schools ────────────────────────────────────────────────────────────────
create policy "schools_select_active_partners" on public.schools
  for select to anon, authenticated using (is_partner = true and is_active = true);
create policy "schools_admin_all" on public.schools
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
create policy "schools_school_admin_select_own" on public.schools
  for select to authenticated using (public.is_school_admin() and id = public.current_user_school_id());

-- ── Cohorts ────────────────────────────────────────────────────────────────
create policy "cohorts_select_active" on public.cohorts
  for select to anon, authenticated
  using (
    is_active = true and status = 'active'
    and (school_id is null or exists (
      select 1 from public.schools s where s.id = cohorts.school_id and s.is_partner and s.is_active
    ))
  );
create policy "cohorts_admin_all" on public.cohorts
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
create policy "cohorts_school_admin_select_own_school" on public.cohorts
  for select to authenticated using (public.is_school_admin() and school_id = public.current_user_school_id());
create policy "cohorts_school_admin_write" on public.cohorts
  for update to authenticated
  using (public.is_school_admin() and school_id = public.current_user_school_id())
  with check (public.is_school_admin() and school_id = public.current_user_school_id());

-- ── Profiles ───────────────────────────────────────────────────────────────
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());
create policy "profiles_update_own_limited" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and approval_status = (select p.approval_status from public.profiles p where p.id = auth.uid())
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );
create policy "profiles_admin_select" on public.profiles
  for select to authenticated using (public.is_bioechem_admin());
create policy "profiles_admin_update_approval" on public.profiles
  for update to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
create policy "profiles_school_admin_select_same_school" on public.profiles
  for select to authenticated
  using (public.is_school_admin() and school_id is not null and school_id = public.current_user_school_id());

-- ── Drive ──────────────────────────────────────────────────────────────────
create policy "drive_admin_all" on public.drive_items
  for all to authenticated using (is_bioechem_admin()) with check (is_bioechem_admin());

-- ── Profile sub-tables ─────────────────────────────────────────────────────
create policy "pa_own_select"   on public.profile_addresses for select to authenticated using (user_id = auth.uid());
create policy "pa_own_insert"   on public.profile_addresses for insert to authenticated with check (user_id = auth.uid());
create policy "pa_own_update"   on public.profile_addresses for update to authenticated using (user_id = auth.uid());
create policy "pa_admin_select" on public.profile_addresses for select to authenticated using (is_bioechem_admin());

create policy "pe_own_select"   on public.profile_education for select to authenticated using (user_id = auth.uid());
create policy "pe_own_insert"   on public.profile_education for insert to authenticated with check (user_id = auth.uid());
create policy "pe_own_delete"   on public.profile_education for delete to authenticated using (user_id = auth.uid());
create policy "pe_admin_select" on public.profile_education for select to authenticated using (is_bioechem_admin());

create policy "pw_own_select"   on public.profile_work_experience for select to authenticated using (user_id = auth.uid());
create policy "pw_own_insert"   on public.profile_work_experience for insert to authenticated with check (user_id = auth.uid());
create policy "pw_own_delete"   on public.profile_work_experience for delete to authenticated using (user_id = auth.uid());
create policy "pw_admin_select" on public.profile_work_experience for select to authenticated using (is_bioechem_admin());

create policy "pec_own_select"   on public.profile_emergency_contacts for select to authenticated using (user_id = auth.uid());
create policy "pec_own_insert"   on public.profile_emergency_contacts for insert to authenticated with check (user_id = auth.uid());
create policy "pec_own_delete"   on public.profile_emergency_contacts for delete to authenticated using (user_id = auth.uid());
create policy "pec_admin_select" on public.profile_emergency_contacts for select to authenticated using (is_bioechem_admin());

-- ── User resumes ───────────────────────────────────────────────────────────
create policy "users_view_own_resumes"   on public.user_resumes for select using (auth.uid() = user_id);
create policy "users_insert_own_resumes" on public.user_resumes for insert with check (auth.uid() = user_id);

-- ── Cohort enrollments ─────────────────────────────────────────────────────
create policy "enrollments_select" on public.cohort_enrollments
  for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_bioechem_admin()
    or (public.is_school_admin() and exists (
      select 1 from public.cohorts c where c.id = cohort_id and c.school_id = public.current_user_school_id()
    ))
    or public.is_teacher_in_cohort(cohort_id)
  );
create policy "enrollments_self_insert" on public.cohort_enrollments
  for insert to authenticated with check (user_id = auth.uid() and public.is_approved());
create policy "enrollments_review" on public.cohort_enrollments
  for update to authenticated
  using (public.can_manage_cohort(cohort_id)) with check (public.can_manage_cohort(cohort_id));
create policy "enrollments_admin_all" on public.cohort_enrollments
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Classroom sessions & recordings ────────────────────────────────────────
create policy "sessions_enrolled_select" on public.class_sessions
  for select to authenticated
  using (public.is_enrolled_in_cohort(cohort_id) or public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());
create policy "sessions_teacher_write" on public.class_sessions
  for all to authenticated
  using (public.can_manage_cohort(cohort_id) or public.is_bioechem_admin())
  with check (public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());

create policy "recordings_enrolled_select" on public.session_recordings
  for select to authenticated
  using (
    (published = true and public.is_enrolled_in_cohort(cohort_id))
    or public.can_manage_cohort(cohort_id)
    or public.is_bioechem_admin()
  );
create policy "recordings_teacher_write" on public.session_recordings
  for all to authenticated
  using (public.can_manage_cohort(cohort_id) or public.is_bioechem_admin())
  with check (public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());

-- ── Modules ────────────────────────────────────────────────────────────────
create policy "modules_enrolled_select" on public.modules
  for select to authenticated
  using ((published = true and public.is_enrolled_in_cohort(cohort_id)) or public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());
create policy "modules_teacher_write" on public.modules
  for insert to authenticated with check (public.can_manage_cohort(cohort_id));
create policy "modules_admin_all" on public.modules
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Module items ───────────────────────────────────────────────────────────
create policy "module_items_enrolled_select" on public.module_items
  for select to authenticated
  using ((published = true and public.is_enrolled_in_cohort(cohort_id)) or public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());
create policy "module_items_teacher_write" on public.module_items
  for insert to authenticated with check (public.can_manage_cohort(cohort_id));
create policy "module_items_admin_all" on public.module_items
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Assignments ────────────────────────────────────────────────────────────
create policy "assignments_enrolled_select" on public.assignments
  for select to authenticated
  using (public.is_enrolled_in_cohort(cohort_id) or public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());
create policy "assignments_teacher_write" on public.assignments
  for insert to authenticated with check (public.can_manage_cohort(cohort_id));
create policy "assignments_admin_all" on public.assignments
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Submissions ────────────────────────────────────────────────────────────
create policy "submissions_select_own" on public.submissions
  for select to authenticated using (user_id = auth.uid());
create policy "submissions_teacher_select" on public.submissions
  for select to authenticated using (public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());
create policy "submissions_insert_own" on public.submissions
  for insert to authenticated with check (user_id = auth.uid() and public.is_enrolled_in_cohort(cohort_id));
create policy "submissions_update_own" on public.submissions
  for update to authenticated using (user_id = auth.uid());
create policy "submissions_admin_all" on public.submissions
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Quizzes ────────────────────────────────────────────────────────────────
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

-- ── Grades ─────────────────────────────────────────────────────────────────
create policy "grades_select" on public.grades
  for select to authenticated
  using (user_id = auth.uid() or public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());
create policy "grades_teacher_write" on public.grades
  for insert to authenticated with check (public.can_manage_cohort(cohort_id));
create policy "grades_admin_all" on public.grades
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Announcements (with visible_to) ────────────────────────────────────────
create policy "announcements_enrolled_select" on public.announcements
  for select to authenticated
  using (
    (
      published = true
      and public.is_enrolled_in_cohort(cohort_id)
      and (
        array_length(visible_to, 1) is null
        or (select role::text from public.profiles where id = auth.uid()) = any(visible_to)
      )
    )
    or public.can_manage_cohort(cohort_id)
    or public.is_bioechem_admin()
  );
create policy "announcements_teacher_write" on public.announcements
  for insert to authenticated with check (public.can_manage_cohort(cohort_id));
create policy "announcements_admin_all" on public.announcements
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Certificates ───────────────────────────────────────────────────────────
create policy "certificates_own_read" on public.certificates
  for select to authenticated using (user_id = auth.uid() and is_approved());
create policy "certificates_admin_all" on public.certificates
  for all to authenticated using (is_bioechem_admin()) with check (is_bioechem_admin());

-- ── Surveys ────────────────────────────────────────────────────────────────
create policy "surveys_admin_all" on public.surveys
  for all to authenticated using (is_bioechem_admin()) with check (is_bioechem_admin());
create policy "surveys_participant_read" on public.surveys
  for select to authenticated using (status = 'active' and is_approved() and is_enrolled_in_cohort(cohort_id));
create policy "survey_responses_own" on public.survey_responses
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "survey_responses_admin_read" on public.survey_responses
  for select to authenticated using (is_bioechem_admin());

-- ── Messaging ──────────────────────────────────────────────────────────────
create policy "conversations_own" on public.conversations
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "conversations_admin" on public.conversations
  for all to authenticated using (is_bioechem_admin()) with check (is_bioechem_admin());
create policy "messages_own_read" on public.messages
  for select to authenticated
  using (conversation_id in (select id from public.conversations where user_id = auth.uid()));
create policy "messages_own_insert" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and conversation_id in (select id from public.conversations where user_id = auth.uid())
  );
create policy "messages_admin" on public.messages
  for all to authenticated using (is_bioechem_admin()) with check (is_bioechem_admin());

-- ── Newsletters (with video_url and visible_to) ────────────────────────────
create policy "newsletters_read" on public.newsletters
  for select
  using (
    published = true
    and (
      array_length(visible_to, 1) is null
      or (auth.uid() is not null and (select role::text from public.profiles where id = auth.uid()) = any(visible_to))
    )
  );
create policy "newsletters_admin_all" on public.newsletters
  for all using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Past events ────────────────────────────────────────────────────────────
create policy "past_events_read" on public.past_events
  for select using (published = true or public.is_bioechem_admin());
create policy "past_events_admin_all" on public.past_events
  for all using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
create policy "event_images_read" on public.event_images
  for select using (exists (
    select 1 from public.past_events e
    where e.id = event_id and (e.published = true or public.is_bioechem_admin())
  ));
create policy "event_images_admin_all" on public.event_images
  for all using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Upcoming events ────────────────────────────────────────────────────────
create policy "upcoming_events_read" on public.upcoming_events
  for select using (published = true or public.is_bioechem_admin());
create policy "upcoming_events_admin_all" on public.upcoming_events
  for all using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Job postings & applications ────────────────────────────────────────────
create policy "jobs_read" on public.job_postings
  for select to authenticated
  using (
    published = true and public.is_approved()
    and (array_length(visible_to, 1) is null or (select role::text from public.profiles where id = auth.uid()) = any(visible_to))
  );
create policy "jobs_admin_all" on public.job_postings
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
create policy "applications_own_insert" on public.job_applications
  for insert to authenticated with check (user_id = auth.uid() and public.is_approved());
create policy "applications_own_select" on public.job_applications
  for select to authenticated using (user_id = auth.uid() or public.is_bioechem_admin());
create policy "applications_admin_update" on public.job_applications
  for update to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
create policy "applications_own_delete" on public.job_applications
  for delete to authenticated using (user_id = auth.uid());

-- ── Shareholder documents & folders ─────────────────────────────────────────
create policy "sharedocs_read" on public.shareholder_documents
  for select to authenticated
  using (
    published = true
    and (
      shareholder_id = auth.uid()
      or (shareholder_id is null and (shared_with is null or auth.uid() = any(shared_with)))
    )
  );
create policy "sharedocs_admin_all" on public.shareholder_documents
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

create policy "shareholder_folders_admin_all" on public.shareholder_folders
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
create policy "shareholder_folders_read_own" on public.shareholder_folders
  for select to authenticated using (shareholder_id = auth.uid());

-- ── Partner content & folders ────────────────────────────────────────────────
create policy "partnerdocs_read" on public.partner_documents
  for select to authenticated
  using (
    published = true
    and partner_id is null
    and (select role::text from public.profiles where id = auth.uid()) in ('industry_partner', 'bioechem_admin')
  );
create policy "partnerdocs_admin_all" on public.partner_documents
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
create policy "partnerdocs_own_folder_select" on public.partner_documents
  for select to authenticated using (partner_id = auth.uid());
create policy "partnerdocs_own_folder_insert" on public.partner_documents
  for insert to authenticated with check (partner_id = auth.uid() and created_by = auth.uid());

create policy "partner_folders_admin_all" on public.partner_folders
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
create policy "partner_folders_read_own" on public.partner_folders
  for select to authenticated using (partner_id = auth.uid());

create policy "partnerevents_read" on public.partner_events
  for select to authenticated
  using (
    published = true
    and (select role::text from public.profiles where id = auth.uid()) in ('industry_partner', 'bioechem_admin')
    and (
      target = 'all'
      or (target = 'specific' and target_partner_id = auth.uid())
      or (
        target in ('industry', 'government')
        and target = (select partner_type from public.profiles where id = auth.uid())
      )
    )
  );
create policy "partnerevents_admin_all" on public.partner_events
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Partner / shareholder announcements ─────────────────────────────────────
create policy "partner_announcements_admin_all" on public.partner_announcements
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
create policy "partner_announcements_partner_read" on public.partner_announcements
  for select to authenticated
  using (
    target = 'all'
    or (target = 'specific' and target_partner_id = auth.uid())
    or (
      target in ('industry', 'government')
      and target = (select partner_type from public.profiles where id = auth.uid())
    )
  );

create policy "shareholder_announcements_admin_all" on public.shareholder_announcements
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());
create policy "shareholder_announcements_read" on public.shareholder_announcements
  for select to authenticated
  using (
    target = 'all'
    or (target = 'specific' and auth.uid() = any(target_shareholder_ids))
  );

-- ── Credits page content ─────────────────────────────────────────────────────
create policy "credits_content_read" on public.credits_page_content
  for select to authenticated using (public.is_approved());
create policy "credits_content_admin_write" on public.credits_page_content
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Career updates ───────────────────────────────────────────────────────────
create policy "career_updates_own_read" on public.career_updates
  for select to authenticated using (user_id = auth.uid());
create policy "career_updates_own_write" on public.career_updates
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "career_updates_manager_read" on public.career_updates
  for select to authenticated using (public.can_manage_cohort(cohort_id));
create policy "career_updates_manager_comment" on public.career_updates
  for update to authenticated
  using (public.can_manage_cohort(cohort_id))
  with check (public.can_manage_cohort(cohort_id));

-- ── Cohort feedback ──────────────────────────────────────────────────────────
-- Row-level security allows any cohort manager (teacher or admin) to read
-- feedback rows; anonymizing the submitter from teachers (but not admins) is
-- enforced in the API layer, which never selects/returns user identity for a
-- teacher caller. See app/api/cohorts/[id]/feedback/route.ts.
create policy "cohort_feedback_own_select" on public.cohort_feedback
  for select to authenticated using (user_id = auth.uid());
create policy "cohort_feedback_own_write" on public.cohort_feedback
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cohort_feedback_manager_read" on public.cohort_feedback
  for select to authenticated using (public.can_manage_cohort(cohort_id));

-- ── Reward points ──────────────────────────────────────────────────────────
create policy "users_read_own_points" on public.point_transactions
  for select using (user_id = auth.uid());
create policy "admins_all_points" on public.point_transactions
  for all using (exists (select 1 from public.profiles where id = auth.uid() and role::text = 'bioechem_admin'));

-- ── Notifications ──────────────────────────────────────────────────────────
create policy "users_read_own_notifications" on public.notifications
  for select using (user_id = auth.uid());
create policy "users_update_own_notifications" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins_insert_notifications" on public.notifications
  for insert with check (exists (select 1 from public.profiles where id = auth.uid() and role::text = 'bioechem_admin'));

-- ---------------------------------------------------------------------------
-- STORAGE BUCKETS & POLICIES
-- ---------------------------------------------------------------------------

-- Avatars (public)
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
create policy "avatars_public_read"   on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars_user_insert"   on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);
create policy "avatars_user_update"   on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);
create policy "avatars_user_delete"   on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);

-- Resumes (public, 10 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', true, 10485760, array['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
create policy "resumes_public_read"   on storage.objects for select using (bucket_id = 'resumes');
create policy "resumes_user_select"   on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (auth.uid())::text = (storage.foldername(name))[1]);
create policy "resumes_user_insert"   on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (auth.uid())::text = (storage.foldername(name))[1]);
create policy "resumes_user_update"   on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (auth.uid())::text = (storage.foldername(name))[1]);
create policy "resumes_user_delete"   on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (auth.uid())::text = (storage.foldername(name))[1]);

-- Course files (public, 50 MB)
insert into storage.buckets (id, name, public, file_size_limit) values ('course-files', 'course-files', true, 52428800)
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;
create policy "course_files_public_read"  on storage.objects for select using (bucket_id = 'course-files');
create policy "course_files_auth_insert"  on storage.objects for insert to authenticated
  with check (bucket_id = 'course-files' and public.is_approved());
create policy "course_files_auth_update"  on storage.objects for update to authenticated
  using (bucket_id = 'course-files' and (auth.uid())::text = (storage.foldername(name))[1]);
create policy "course_files_auth_delete"  on storage.objects for delete to authenticated
  using (bucket_id = 'course-files' and (auth.uid())::text = (storage.foldername(name))[1]);

-- Newsletter files (public PDF, 20 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsletter-files', 'newsletter-files', true, 20971520, array['application/pdf'])
on conflict (id) do nothing;
create policy "newsletter_files_read"   on storage.objects for select using (bucket_id = 'newsletter-files');
create policy "newsletter_files_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'newsletter-files' and public.is_bioechem_admin());
create policy "newsletter_files_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'newsletter-files' and public.is_bioechem_admin());

-- Newsletter videos (public, 100 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsletter-videos', 'newsletter-videos', true, 104857600, array['video/mp4','video/webm','video/ogg','video/quicktime'])
on conflict (id) do nothing;
create policy "newsletter_videos_read"   on storage.objects for select using (bucket_id = 'newsletter-videos');
create policy "newsletter_videos_insert" on storage.objects for insert
  with check (bucket_id = 'newsletter-videos' and public.is_bioechem_admin());
create policy "newsletter_videos_delete" on storage.objects for delete
  using (bucket_id = 'newsletter-videos' and public.is_bioechem_admin());

-- Event photos (public, 10 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;
create policy "event_photos_read"   on storage.objects for select using (bucket_id = 'event-photos');
create policy "event_photos_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'event-photos' and public.is_bioechem_admin());
create policy "event_photos_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'event-photos' and public.is_bioechem_admin());

-- Certificates (public read, admin write, 20 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', true, 20971520, array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy "certificates_public_read"  on storage.objects for select using (bucket_id = 'certificates');
create policy "certificates_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'certificates' and public.is_bioechem_admin());
create policy "certificates_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'certificates' and public.is_bioechem_admin());

-- Drive (private, no size limit)
insert into storage.buckets (id, name, public) values ('drive', 'drive', false) on conflict (id) do nothing;

-- Shareholder docs (private, 50 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shareholder-docs', 'shareholder-docs', false, 52428800, array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
])
on conflict (id) do nothing;
create policy "sharedocs_storage_insert" on storage.objects for insert
  with check (bucket_id = 'shareholder-docs' and public.is_bioechem_admin());
create policy "sharedocs_storage_select" on storage.objects for select
  using (bucket_id = 'shareholder-docs' and (select role::text from public.profiles where id = auth.uid()) in ('shareholder', 'bioechem_admin'));
create policy "sharedocs_storage_delete" on storage.objects for delete
  using (bucket_id = 'shareholder-docs' and public.is_bioechem_admin());

-- Partner docs (private, 50 MB)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('partner-docs', 'partner-docs', false, 52428800, array[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation'
])
on conflict (id) do nothing;
create policy "partnerdocs_storage_insert" on storage.objects for insert
  with check (bucket_id = 'partner-docs' and public.is_bioechem_admin());
create policy "partnerdocs_storage_select" on storage.objects for select
  using (bucket_id = 'partner-docs' and (select role::text from public.profiles where id = auth.uid()) in ('industry_partner', 'bioechem_admin'));
create policy "partnerdocs_storage_delete" on storage.objects for delete
  using (bucket_id = 'partner-docs' and public.is_bioechem_admin());

-- ---------------------------------------------------------------------------
-- DEV SEED — remove or adjust for production
-- ---------------------------------------------------------------------------

insert into public.schools (name, slug, is_partner, is_active)
values ('Demo Partner High School', 'demo-partner-high', true, true)
on conflict (slug) do nothing;

insert into public.cohorts (school_id, name, status, is_active, enrollment_requires_approval)
select s.id, 'Fall 2026 Bio Battery Cohort', 'active', true, false
from public.schools s
where s.slug = 'demo-partner-high'
  and not exists (
    select 1 from public.cohorts c
    where c.school_id = s.id and c.name = 'Fall 2026 Bio Battery Cohort'
  );

insert into public.credits_page_content (intro_text, claim_text, actions)
select
  'BioEchem wants to recognize students and teachers who stay active and engaged on the portal — keeping your profile current, sharing feedback, and following through on your program. Every time you do one of the actions below, you earn credits. Credits can later be redeemed for reimbursement (e.g. program-related expenses) or to purchase BioEchem items.',
  'Since this isn''t automated yet, keep a note of what you did and when (e.g. "updated my career path on March 3"), then email us to claim your credits.',
  '[
    {"action": "Update your Career Path & Interests", "credits": "1 credit", "note": "Each time you meaningfully update it in a cohort — e.g. new interests, plans, or an attached document."},
    {"action": "Submit program feedback or a survey", "credits": "2 credits", "note": "Halfway, final, or custom surveys sent by BioEchem."},
    {"action": "Complete your profile & background", "credits": "1 credit", "note": "Filling in your background section (education, work experience, etc.) once it''s fully complete."},
    {"action": "Complete a program / earn a certificate", "credits": "5 credits", "note": "Awarded when you finish a cohort and receive your certificate."}
  ]'::jsonb
where not exists (select 1 from public.credits_page_content);
