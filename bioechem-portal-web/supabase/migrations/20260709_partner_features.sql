-- ---------------------------------------------------------------------------
-- Industry partner dashboard content: documents, events, programs.
-- Additive migration — run once against the Supabase project (SQL editor or
-- `psql "$CONNECTION_STRING" -f supabase/migrations/20260709_partner_features.sql`).
-- Mirrors the existing shareholder_documents pattern.
-- ---------------------------------------------------------------------------

-- ── Partner documents (impact reports, collateral) ──────────────────────────
create table public.partner_documents (
  id           uuid primary key default gen_random_uuid(),
  title        text    not null,
  description  text,
  category     text    not null default 'general',
  file_url     text,
  storage_path text,
  file_name    text,
  size_bytes   bigint,
  mime_type    text,
  published    boolean not null default true,
  created_by   uuid    references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.partner_documents enable row level security;

create policy "partnerdocs_read" on public.partner_documents
  for select to authenticated
  using (published = true and (select role::text from public.profiles where id = auth.uid()) in ('industry_partner', 'bioechem_admin'));
create policy "partnerdocs_admin_all" on public.partner_documents
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Partner events (workshops, demos, outreach) ─────────────────────────────
create table public.partner_events (
  id           uuid primary key default gen_random_uuid(),
  title        text    not null,
  description  text,
  event_date   date,
  location     text,
  link         text,
  published    boolean not null default true,
  position     integer not null default 0,
  created_by   uuid    references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.partner_events enable row level security;

create policy "partnerevents_read" on public.partner_events
  for select to authenticated
  using (published = true and (select role::text from public.profiles where id = auth.uid()) in ('industry_partner', 'bioechem_admin'));
create policy "partnerevents_admin_all" on public.partner_events
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Partner programs (active collaboration programs) ────────────────────────
create table public.partner_programs (
  id           uuid primary key default gen_random_uuid(),
  title        text    not null,
  description  text,
  status       text    not null default 'active' check (status in ('active', 'upcoming', 'completed')),
  published    boolean not null default true,
  position     integer not null default 0,
  created_by   uuid    references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.partner_programs enable row level security;

create policy "partnerprograms_read" on public.partner_programs
  for select to authenticated
  using (published = true and (select role::text from public.profiles where id = auth.uid()) in ('industry_partner', 'bioechem_admin'));
create policy "partnerprograms_admin_all" on public.partner_programs
  for all to authenticated using (public.is_bioechem_admin()) with check (public.is_bioechem_admin());

-- ── Storage bucket for partner documents (private, 50 MB, same file types as shareholder-docs) ──
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
