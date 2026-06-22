-- BioEchem Partner Portal — database schema
--
-- Fresh Supabase project: paste this entire file into Dashboard → SQL Editor → Run.
-- Safe to re-run on a dev project (drops and recreates all portal tables/functions/policies).

-- ---------------------------------------------------------------------------
-- Reset (portal objects only)
-- Drop tables first with CASCADE — this automatically removes all their
-- policies, indexes, and triggers, so no separate DROP POLICY needed.
-- ---------------------------------------------------------------------------

-- Auth triggers (auth.users always exists so these are safe)
drop trigger if exists on_auth_user_created on auth.users;

-- LMS tables (CASCADE removes dependent policies/indexes)
drop table if exists public.grades           cascade;
drop table if exists public.submissions      cascade;
drop table if exists public.assignments      cascade;
drop table if exists public.module_items     cascade;
drop table if exists public.modules          cascade;
drop table if exists public.announcements    cascade;
drop table if exists public.cohort_enrollments cascade;

-- Core tables (CASCADE removes dependent policies/indexes/triggers)
drop table if exists public.user_resumes cascade;
drop table if exists public.profiles     cascade;
drop table if exists public.cohorts      cascade;
drop table if exists public.schools      cascade;

-- Functions (tables referencing them are already gone)
drop function if exists public.is_teacher_in_cohort(uuid)    cascade;
drop function if exists public.is_enrolled_in_cohort(uuid)   cascade;
drop function if exists public.can_manage_cohort(uuid)       cascade;
drop function if exists public.handle_new_user()             cascade;
drop function if exists public.validate_profile_cohort_school() cascade;
drop function if exists public.current_user_school_id()      cascade;
drop function if exists public.is_school_admin()             cascade;
drop function if exists public.is_bioechem_admin()           cascade;
drop function if exists public.is_approved()                 cascade;

-- Storage policies (storage.objects always exists)
drop policy if exists avatars_public_read   on storage.objects;
drop policy if exists avatars_user_insert   on storage.objects;
drop policy if exists avatars_user_update   on storage.objects;
drop policy if exists avatars_user_delete   on storage.objects;
drop policy if exists resumes_public_read   on storage.objects;
drop policy if exists resumes_user_select   on storage.objects;
drop policy if exists resumes_user_insert   on storage.objects;
drop policy if exists resumes_user_update   on storage.objects;
drop policy if exists resumes_user_delete   on storage.objects;
drop policy if exists course_files_public_read  on storage.objects;
drop policy if exists course_files_auth_insert  on storage.objects;
drop policy if exists course_files_auth_update  on storage.objects;
drop policy if exists course_files_auth_delete  on storage.objects;

drop type if exists public.approval_status cascade;
drop type if exists public.user_role       cascade;

-- ---------------------------------------------------------------------------
-- Enums
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

-- ---------------------------------------------------------------------------
-- Schools
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
  contact_email text,
  contact_phone text,
  is_partner    boolean not null default true,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Cohorts / classes
-- school_id is nullable — null means a standalone (BioEChem-wide) cohort
-- ---------------------------------------------------------------------------

create table public.cohorts (
  id                           uuid    primary key default gen_random_uuid(),
  school_id                    uuid    references public.schools(id) on delete cascade,
  name                         text    not null,
  description                  text,
  start_date                   date,
  end_date                     date,
  max_enrollment               int,                        -- null = unlimited
  enrollment_requires_approval boolean not null default false,
  status                       text    not null default 'active'
                                 check (status in ('draft','active','archived')),
  is_active                    boolean not null default true,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz not null default now()
);

create index cohorts_school_id_idx  on public.cohorts(school_id);
create index cohorts_status_idx     on public.cohorts(status);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  email               text,
  full_name           text,
  first_name          text,
  last_name           text,
  middle_name         text,
  phone               text,
  address_street      text,
  address_apt         text,
  address_city        text,
  address_state       text,
  address_country     text,
  address_zip         text,
  state               text,
  gender              text,
  avatar_url          text,
  bio                 text,
  grade               text,
  school_country      text,
  resume_url          text,
  education_background jsonb not null default '[]'::jsonb,
  work_experience      jsonb not null default '[]'::jsonb,
  emergency_contacts   jsonb not null default '[]'::jsonb,
  age                 smallint,
  role                public.user_role not null default 'participant',
  school_id           uuid references public.schools(id),
  other_school_name   text,
  cohort_id           uuid references public.cohorts(id),
  approval_status     public.approval_status not null default 'pending',
  approved_at         timestamptz,
  approved_by         uuid references public.profiles(id),
  rejection_reason    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index profiles_approval_status_idx on public.profiles(approval_status);
create index profiles_school_id_idx       on public.profiles(school_id);

-- ---------------------------------------------------------------------------
-- Profile cohort/school validation trigger
-- Only enforced for school-affiliated cohorts (standalone cohorts have school_id = null)
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
-- Signup trigger — auth.users → profiles
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
    address_street, address_apt, address_city, address_state, address_country, address_zip,
    age, role, school_id, other_school_name, cohort_id, approval_status
  ) values (
    new.id, new.email,
    coalesce(v_full_name,''),
    v_first_name, v_last_name, v_middle_name,
    nullif(trim(new.raw_user_meta_data->>'phone'),''),
    nullif(trim(new.raw_user_meta_data->>'address_street'),''),
    nullif(trim(new.raw_user_meta_data->>'address_apt'),''),
    nullif(trim(new.raw_user_meta_data->>'address_city'),''),
    nullif(trim(new.raw_user_meta_data->>'address_state'),''),
    nullif(trim(new.raw_user_meta_data->>'address_country'),''),
    nullif(trim(new.raw_user_meta_data->>'address_zip'),''),
    v_age, v_role, v_school_id, v_other_school_name, v_cohort_id, 'pending'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Resume history
-- ---------------------------------------------------------------------------

create table public.user_resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  url         text not null,
  filename    text,
  uploaded_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- LMS: Cohort enrollments
-- Tracks who is in which cohort (teacher or participant) with approval status
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
-- LMS: Modules (weekly / unit groupings inside a cohort)
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
-- LMS: Module items (notes, assignments, files, links)
-- ---------------------------------------------------------------------------

create table public.module_items (
  id           uuid primary key default gen_random_uuid(),
  module_id    uuid not null references public.modules(id) on delete cascade,
  cohort_id    uuid not null references public.cohorts(id) on delete cascade,
  type         text not null check (type in ('note','assignment','file','link')),
  title        text not null,
  content      text,        -- markdown / rich text for notes
  file_url     text,
  external_url text,
  position     int  not null default 0,
  published    boolean not null default false,
  created_by   uuid not null references public.profiles(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index module_items_module_id_idx  on public.module_items(module_id);
create index module_items_cohort_id_idx  on public.module_items(cohort_id);

-- ---------------------------------------------------------------------------
-- LMS: Assignments (extended metadata for assignment-type module items)
-- ---------------------------------------------------------------------------

create table public.assignments (
  id              uuid primary key default gen_random_uuid(),
  module_item_id  uuid not null unique references public.module_items(id) on delete cascade,
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  due_at          timestamptz,
  max_points      int  not null default 100,
  submission_type text not null default 'any'
                    check (submission_type in ('file','text','any')),
  instructions    text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index assignments_cohort_id_idx on public.assignments(cohort_id);

-- ---------------------------------------------------------------------------
-- LMS: Submissions
-- ---------------------------------------------------------------------------

create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references public.assignments(id) on delete cascade,
  user_id         uuid not null references public.profiles(id) on delete cascade,
  cohort_id       uuid not null references public.cohorts(id) on delete cascade,
  submission_text text,
  file_url        text,
  filename        text,
  submitted_at    timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(assignment_id, user_id)
);

create index submissions_assignment_id_idx on public.submissions(assignment_id);
create index submissions_user_id_idx       on public.submissions(user_id);

-- ---------------------------------------------------------------------------
-- LMS: Grades
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
-- LMS: Announcements
-- ---------------------------------------------------------------------------

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  cohort_id  uuid not null references public.cohorts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id),
  title      text not null,
  body       text not null,
  is_pinned  boolean not null default false,
  published  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index announcements_cohort_id_idx on public.announcements(cohort_id);

-- ---------------------------------------------------------------------------
-- RLS helpers
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

-- True when the current user has an approved enrollment as 'teacher' in the given cohort
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

-- True when the current user has an approved enrollment (any role) in the given cohort
create or replace function public.is_enrolled_in_cohort(p_cohort_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.cohort_enrollments e
    where e.cohort_id = p_cohort_id
      and e.user_id   = auth.uid()
      and e.status    = 'approved'
  );
$$;

-- True when current user can manage a cohort (admin, school-admin for that school, or teacher)
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
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.schools           enable row level security;
alter table public.cohorts           enable row level security;
alter table public.profiles          enable row level security;
alter table public.user_resumes      enable row level security;
alter table public.cohort_enrollments enable row level security;
alter table public.modules           enable row level security;
alter table public.module_items      enable row level security;
alter table public.assignments       enable row level security;
alter table public.submissions       enable row level security;
alter table public.grades            enable row level security;
alter table public.announcements     enable row level security;

-- ── Schools ────────────────────────────────────────────────────────────────

create policy "schools_select_active_partners"
  on public.schools for select to anon, authenticated
  using (is_partner = true and is_active = true);

create policy "schools_admin_all"
  on public.schools for all to authenticated
  using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

create policy "schools_school_admin_select_own"
  on public.schools for select to authenticated
  using (public.is_school_admin() and id = public.current_user_school_id());

-- ── Cohorts ────────────────────────────────────────────────────────────────

-- Active cohorts visible to authenticated users:
--   - school-affiliated: school must be active partner
--   - standalone (school_id null): always visible when active
create policy "cohorts_select_active"
  on public.cohorts for select to anon, authenticated
  using (
    is_active = true
    and status = 'active'
    and (
      school_id is null
      or exists (
        select 1 from public.schools s
        where s.id = cohorts.school_id and s.is_partner and s.is_active
      )
    )
  );

create policy "cohorts_admin_all"
  on public.cohorts for all to authenticated
  using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- School admins can read + write their own school's cohorts
create policy "cohorts_school_admin_select_own_school"
  on public.cohorts for select to authenticated
  using (public.is_school_admin() and school_id = public.current_user_school_id());

create policy "cohorts_school_admin_write"
  on public.cohorts for update to authenticated
  using (public.is_school_admin() and school_id = public.current_user_school_id())
  with check (public.is_school_admin() and school_id = public.current_user_school_id());

-- ── Profiles ───────────────────────────────────────────────────────────────

create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

create policy "profiles_update_own_limited"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and approval_status = (select p.approval_status from public.profiles p where p.id = auth.uid())
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

create policy "profiles_admin_select"
  on public.profiles for select to authenticated
  using (public.is_bioechem_admin());

create policy "profiles_admin_update_approval"
  on public.profiles for update to authenticated
  using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

create policy "profiles_school_admin_select_same_school"
  on public.profiles for select to authenticated
  using (
    public.is_school_admin()
    and school_id is not null
    and school_id = public.current_user_school_id()
  );

-- ── User resumes ───────────────────────────────────────────────────────────

create policy "users_view_own_resumes"
  on public.user_resumes for select using (auth.uid() = user_id);

create policy "users_insert_own_resumes"
  on public.user_resumes for insert with check (auth.uid() = user_id);

-- ── Cohort enrollments ─────────────────────────────────────────────────────

-- Users see their own enrollments; managers see all enrollments in their cohort
create policy "enrollments_select"
  on public.cohort_enrollments for select to authenticated
  using (
    user_id = auth.uid()
    or public.is_bioechem_admin()
    or (public.is_school_admin() and exists (
        select 1 from public.cohorts c
        where c.id = cohort_id and c.school_id = public.current_user_school_id()
    ))
    or public.is_teacher_in_cohort(cohort_id)
  );

-- Approved users can self-enroll
create policy "enrollments_self_insert"
  on public.cohort_enrollments for insert to authenticated
  with check (user_id = auth.uid() and public.is_approved());

-- Teachers, school admins, and bioechem admins can approve/reject enrollments
create policy "enrollments_review"
  on public.cohort_enrollments for update to authenticated
  using (public.can_manage_cohort(cohort_id))
  with check (public.can_manage_cohort(cohort_id));

create policy "enrollments_admin_all"
  on public.cohort_enrollments for all to authenticated
  using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Modules ────────────────────────────────────────────────────────────────

-- Enrolled users see published modules; managers see all
create policy "modules_enrolled_select"
  on public.modules for select to authenticated
  using (
    (published = true and public.is_enrolled_in_cohort(cohort_id))
    or public.can_manage_cohort(cohort_id)
    or public.is_bioechem_admin()
  );

create policy "modules_teacher_write"
  on public.modules for insert to authenticated
  with check (public.can_manage_cohort(cohort_id));

create policy "modules_admin_all"
  on public.modules for all to authenticated
  using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Module items ───────────────────────────────────────────────────────────

create policy "module_items_enrolled_select"
  on public.module_items for select to authenticated
  using (
    (published = true and public.is_enrolled_in_cohort(cohort_id))
    or public.can_manage_cohort(cohort_id)
    or public.is_bioechem_admin()
  );

create policy "module_items_teacher_write"
  on public.module_items for insert to authenticated
  with check (public.can_manage_cohort(cohort_id));

create policy "module_items_admin_all"
  on public.module_items for all to authenticated
  using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Assignments ────────────────────────────────────────────────────────────

create policy "assignments_enrolled_select"
  on public.assignments for select to authenticated
  using (
    public.is_enrolled_in_cohort(cohort_id)
    or public.can_manage_cohort(cohort_id)
    or public.is_bioechem_admin()
  );

create policy "assignments_teacher_write"
  on public.assignments for insert to authenticated
  with check (public.can_manage_cohort(cohort_id));

create policy "assignments_admin_all"
  on public.assignments for all to authenticated
  using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Submissions ────────────────────────────────────────────────────────────

create policy "submissions_select_own"
  on public.submissions for select to authenticated
  using (user_id = auth.uid());

create policy "submissions_teacher_select"
  on public.submissions for select to authenticated
  using (public.can_manage_cohort(cohort_id) or public.is_bioechem_admin());

create policy "submissions_insert_own"
  on public.submissions for insert to authenticated
  with check (user_id = auth.uid() and public.is_enrolled_in_cohort(cohort_id));

create policy "submissions_update_own"
  on public.submissions for update to authenticated
  using (user_id = auth.uid());

create policy "submissions_admin_all"
  on public.submissions for all to authenticated
  using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Grades ─────────────────────────────────────────────────────────────────

create policy "grades_select"
  on public.grades for select to authenticated
  using (
    user_id = auth.uid()
    or public.can_manage_cohort(cohort_id)
    or public.is_bioechem_admin()
  );

create policy "grades_teacher_write"
  on public.grades for insert to authenticated
  with check (public.can_manage_cohort(cohort_id));

create policy "grades_admin_all"
  on public.grades for all to authenticated
  using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Announcements ──────────────────────────────────────────────────────────

create policy "announcements_enrolled_select"
  on public.announcements for select to authenticated
  using (
    (published = true and public.is_enrolled_in_cohort(cohort_id))
    or public.can_manage_cohort(cohort_id)
    or public.is_bioechem_admin()
  );

create policy "announcements_teacher_write"
  on public.announcements for insert to authenticated
  with check (public.can_manage_cohort(cohort_id));

create policy "announcements_admin_all"
  on public.announcements for all to authenticated
  using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ---------------------------------------------------------------------------
-- Storage: avatars
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_public_read   on storage.objects;
drop policy if exists avatars_user_insert   on storage.objects;
drop policy if exists avatars_user_update   on storage.objects;
drop policy if exists avatars_user_delete   on storage.objects;

create policy "avatars_public_read"
  on storage.objects for select using (bucket_id = 'avatars');

create policy "avatars_user_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "avatars_user_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "avatars_user_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (auth.uid())::text = (storage.foldername(name))[1]);

-- ---------------------------------------------------------------------------
-- Storage: resumes
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'resumes', 'resumes', true, 10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
on conflict (id) do update set
  public             = true,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists resumes_public_read   on storage.objects;
drop policy if exists resumes_user_select   on storage.objects;
drop policy if exists resumes_user_insert   on storage.objects;
drop policy if exists resumes_user_update   on storage.objects;
drop policy if exists resumes_user_delete   on storage.objects;

create policy "resumes_public_read"
  on storage.objects for select using (bucket_id = 'resumes');

create policy "resumes_user_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'resumes' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "resumes_user_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'resumes' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "resumes_user_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'resumes' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "resumes_user_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'resumes' and (auth.uid())::text = (storage.foldername(name))[1]);

-- ---------------------------------------------------------------------------
-- Storage: course-files (module attachments + submission uploads)
-- Public bucket — access controlled at the app layer (enrolled users only)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit)
values ('course-files', 'course-files', true, 52428800)  -- 50 MB
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit;

drop policy if exists course_files_public_read    on storage.objects;
drop policy if exists course_files_auth_insert    on storage.objects;
drop policy if exists course_files_auth_update    on storage.objects;
drop policy if exists course_files_auth_delete    on storage.objects;

create policy "course_files_public_read"
  on storage.objects for select using (bucket_id = 'course-files');

create policy "course_files_auth_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'course-files' and public.is_approved());

create policy "course_files_auth_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'course-files' and (auth.uid())::text = (storage.foldername(name))[1]);

create policy "course_files_auth_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'course-files' and (auth.uid())::text = (storage.foldername(name))[1]);

-- ---------------------------------------------------------------------------
-- Landing page CMS — newsletters & past events
-- ---------------------------------------------------------------------------

create table if not exists public.newsletters (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null,
  excerpt     text not null,
  body        text,
  pdf_url     text,
  published   boolean not null default false,
  position    int not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.past_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  date        date not null,
  location    text not null,
  description text not null,
  highlights  text[] not null default '{}',
  link        text,
  published   boolean not null default false,
  position    int not null default 0,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.event_images (
  id          uuid primary key default gen_random_uuid(),
  event_id    uuid not null references public.past_events(id) on delete cascade,
  url         text not null,
  filename    text not null default '',
  position    int not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.newsletters  enable row level security;
alter table public.past_events  enable row level security;
alter table public.event_images enable row level security;

drop policy if exists "newsletters_read"        on public.newsletters;
drop policy if exists "newsletters_admin_all"   on public.newsletters;
drop policy if exists "past_events_read"        on public.past_events;
drop policy if exists "past_events_admin_all"   on public.past_events;
drop policy if exists "event_images_read"       on public.event_images;
drop policy if exists "event_images_admin_all"  on public.event_images;

create policy "newsletters_read"       on public.newsletters
  for select using (published = true or public.is_bioechem_admin());
create policy "newsletters_admin_all"  on public.newsletters
  for all using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

create policy "past_events_read"       on public.past_events
  for select using (published = true or public.is_bioechem_admin());
create policy "past_events_admin_all"  on public.past_events
  for all using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

create policy "event_images_read"      on public.event_images
  for select using (
    exists (
      select 1 from public.past_events e
      where e.id = event_id and (e.published = true or public.is_bioechem_admin())
    )
  );
create policy "event_images_admin_all" on public.event_images
  for all using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- Storage buckets for landing content
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('newsletter-files', 'newsletter-files', true, 20971520, array['application/pdf'])
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-photos', 'event-photos', true, 10485760,
  array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "newsletter_files_read"   on storage.objects;
drop policy if exists "newsletter_files_insert" on storage.objects;
drop policy if exists "newsletter_files_delete" on storage.objects;
drop policy if exists "event_photos_read"       on storage.objects;
drop policy if exists "event_photos_insert"     on storage.objects;
drop policy if exists "event_photos_delete"     on storage.objects;

create policy "newsletter_files_read"
  on storage.objects for select using (bucket_id = 'newsletter-files');
create policy "newsletter_files_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'newsletter-files' and public.is_bioechem_admin());
create policy "newsletter_files_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'newsletter-files' and public.is_bioechem_admin());

create policy "event_photos_read"
  on storage.objects for select using (bucket_id = 'event-photos');
create policy "event_photos_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'event-photos' and public.is_bioechem_admin());
create policy "event_photos_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'event-photos' and public.is_bioechem_admin());

-- ---------------------------------------------------------------------------
-- Dev seed (remove / adjust for production)
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
