-- BioEchem Partner Portal — full database schema
-- Paste this entire file into Supabase Dashboard → SQL Editor (fresh dev project).
-- Re-running drops and recreates portal tables, functions, and policies.

-- ---------------------------------------------------------------------------
-- Reset (portal objects only)
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists profiles_validate_cohort_school on public.profiles;

drop policy if exists profiles_school_admin_select_same_school on public.profiles;
drop policy if exists profiles_admin_update_approval on public.profiles;
drop policy if exists profiles_admin_select on public.profiles;
drop policy if exists profiles_update_own_limited on public.profiles;
drop policy if exists profiles_select_own on public.profiles;

drop policy if exists cohorts_school_admin_select_own_school on public.cohorts;
drop policy if exists cohorts_admin_all on public.cohorts;
drop policy if exists cohorts_select_active on public.cohorts;

drop policy if exists schools_school_admin_select_own on public.schools;
drop policy if exists schools_admin_all on public.schools;
drop policy if exists schools_select_active_partners on public.schools;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.validate_profile_cohort_school() cascade;
drop function if exists public.current_user_school_id() cascade;
drop function if exists public.is_school_admin() cascade;
drop function if exists public.is_bioechem_admin() cascade;
drop function if exists public.is_approved() cascade;

drop table if exists public.profiles cascade;
drop table if exists public.cohorts cascade;
drop table if exists public.schools cascade;

drop type if exists public.approval_status cascade;
drop type if exists public.user_role cascade;

-- ---------------------------------------------------------------------------
-- Types
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
-- Schools & cohorts
-- ---------------------------------------------------------------------------

create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  is_partner boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools (id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create index cohorts_school_id_idx on public.cohorts (school_id);

-- ---------------------------------------------------------------------------
-- Profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text,
  age smallint,
  role public.user_role not null default 'participant',
  school_id uuid references public.schools (id),
  other_school_name text,
  cohort_id uuid references public.cohorts (id),
  approval_status public.approval_status not null default 'pending',
  approved_at timestamptz,
  approved_by uuid references auth.users (id),
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_approval_status_idx on public.profiles (approval_status);
create index profiles_school_id_idx on public.profiles (school_id);

-- ---------------------------------------------------------------------------
-- Profile validation (cohort must belong to school)
-- ---------------------------------------------------------------------------

create or replace function public.validate_profile_cohort_school()
returns trigger
language plpgsql
as $$
begin
  if new.cohort_id is null then
    return new;
  end if;

  if new.school_id is null then
    raise exception 'school_id is required when cohort_id is set';
  end if;

  if not exists (
    select 1
    from public.cohorts c
    where c.id = new.cohort_id
      and c.school_id = new.school_id
  ) then
    raise exception 'cohort does not belong to the selected school';
  end if;

  return new;
end;
$$;

create trigger profiles_validate_cohort_school
  before insert or update of school_id, cohort_id on public.profiles
  for each row
  execute function public.validate_profile_cohort_school();

-- ---------------------------------------------------------------------------
-- Signup → profile (reads auth.users raw_user_meta_data)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_school_id uuid;
  v_cohort_id uuid;
  v_role public.user_role;
  v_age smallint;
  v_other_school_name text;
begin
  v_school_id := nullif(new.raw_user_meta_data->>'school_id', '')::uuid;
  v_cohort_id := nullif(new.raw_user_meta_data->>'cohort_id', '')::uuid;
  v_other_school_name := nullif(trim(new.raw_user_meta_data->>'other_school_name'), '');
  v_role := coalesce(
    (new.raw_user_meta_data->>'role')::public.user_role,
    'participant'::public.user_role
  );

  if v_role in ('bioechem_admin', 'industry_partner', 'shareholder') then
    v_school_id := null;
    v_cohort_id := null;
    v_other_school_name := null;
  else
    if v_other_school_name is not null then
      v_school_id := null;
      v_cohort_id := null;
    elsif v_school_id is null then
      raise exception 'school_id or other_school_name is required for participants, teachers, and school admins';
    else
      if not exists (
        select 1
        from public.schools s
        where s.id = v_school_id
          and s.is_partner = true
          and s.is_active = true
      ) then
        raise exception 'Invalid or inactive partner school';
      end if;

      if v_role = 'school_admin' then
        v_cohort_id := null;
      elsif v_cohort_id is not null and not exists (
        select 1
        from public.cohorts c
        where c.id = v_cohort_id
          and c.school_id = v_school_id
          and c.is_active = true
      ) then
        raise exception 'Invalid cohort for school';
      end if;
    end if;
  end if;

  v_age := null;
  if v_role = 'participant' then
    v_age := nullif(new.raw_user_meta_data->>'age', '')::smallint;
    if v_age is null then
      raise exception 'age is required for participants';
    end if;
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    age,
    role,
    school_id,
    other_school_name,
    cohort_id,
    approval_status
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    v_age,
    v_role,
    v_school_id,
    v_other_school_name,
    v_cohort_id,
    'pending'
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- RLS helpers
-- ---------------------------------------------------------------------------

create or replace function public.is_approved()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.approval_status = 'approved'
  );
$$;

create or replace function public.is_bioechem_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'bioechem_admin'
      and p.approval_status = 'approved'
  );
$$;

create or replace function public.is_school_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'school_admin'
      and p.approval_status = 'approved'
      and p.school_id is not null
  );
$$;

create or replace function public.current_user_school_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.school_id
  from public.profiles p
  where p.id = auth.uid()
    and p.approval_status = 'approved'
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.schools enable row level security;
alter table public.cohorts enable row level security;
alter table public.profiles enable row level security;

-- Schools
create policy "schools_select_active_partners"
  on public.schools
  for select
  to anon, authenticated
  using (is_partner = true and is_active = true);

create policy "schools_admin_all"
  on public.schools
  for all
  to authenticated
  using (public.is_bioechem_admin())
  with check (public.is_bioechem_admin());

create policy "schools_school_admin_select_own"
  on public.schools
  for select
  to authenticated
  using (
    public.is_school_admin()
    and id = public.current_user_school_id()
  );

-- Cohorts
create policy "cohorts_select_active"
  on public.cohorts
  for select
  to anon, authenticated
  using (
    is_active = true
    and exists (
      select 1
      from public.schools s
      where s.id = cohorts.school_id
        and s.is_partner = true
        and s.is_active = true
    )
  );

create policy "cohorts_admin_all"
  on public.cohorts
  for all
  to authenticated
  using (public.is_bioechem_admin())
  with check (public.is_bioechem_admin());

create policy "cohorts_school_admin_select_own_school"
  on public.cohorts
  for select
  to authenticated
  using (
    public.is_school_admin()
    and school_id = public.current_user_school_id()
  );

-- Profiles
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

create policy "profiles_update_own_limited"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and approval_status = (select p.approval_status from public.profiles p where p.id = auth.uid())
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

create policy "profiles_admin_select"
  on public.profiles
  for select
  to authenticated
  using (public.is_bioechem_admin());

create policy "profiles_admin_update_approval"
  on public.profiles
  for update
  to authenticated
  using (public.is_bioechem_admin())
  with check (public.is_bioechem_admin());

create policy "profiles_school_admin_select_same_school"
  on public.profiles
  for select
  to authenticated
  using (
    public.is_school_admin()
    and school_id is not null
    and school_id = public.current_user_school_id()
  );

-- ---------------------------------------------------------------------------
-- Dev seed (optional — remove or change in production)
-- ---------------------------------------------------------------------------

insert into public.schools (name, slug, is_partner, is_active)
values ('Demo Partner High School', 'demo-partner-high', true, true)
on conflict (slug) do nothing;

insert into public.cohorts (school_id, name, is_active)
select s.id, 'Fall 2026 Bio Battery Cohort', true
from public.schools s
where s.slug = 'demo-partner-high'
  and not exists (
    select 1
    from public.cohorts c
    where c.school_id = s.id
      and c.name = 'Fall 2026 Bio Battery Cohort'
  );
