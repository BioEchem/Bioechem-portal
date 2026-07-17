-- 1) Differentiate industry vs. government partners.
-- 2) Let admins send an announcement (message + optional file) to all
--    partners, one partner type, or a specific partner.
-- Run this once in the Supabase SQL editor.

alter table public.profiles
  add column if not exists partner_type text check (partner_type in ('industry', 'government'));

create table if not exists public.partner_announcements (
  id                 uuid        primary key default gen_random_uuid(),
  title              text        not null,
  body               text        not null,
  target             text        not null check (target in ('all', 'industry', 'government', 'specific')),
  target_partner_id  uuid        references public.profiles(id) on delete cascade,
  storage_path       text,
  file_name          text,
  size_bytes         bigint,
  mime_type          text,
  created_by         uuid        not null references public.profiles(id),
  created_at         timestamptz not null default now()
);

create index if not exists partner_announcements_target_partner_id_idx
  on public.partner_announcements(target_partner_id);

alter table public.partner_announcements enable row level security;

-- Admins manage everything (uses the existing is_bioechem_admin() helper).
drop policy if exists "partner_announcements_admin_all" on public.partner_announcements;
create policy "partner_announcements_admin_all"
  on public.partner_announcements for all
  using (public.is_bioechem_admin())
  with check (public.is_bioechem_admin());

-- Partners can read announcements addressed to them: broadcast to everyone,
-- broadcast to their partner_type, or sent to them specifically.
drop policy if exists "partner_announcements_partner_read" on public.partner_announcements;
create policy "partner_announcements_partner_read"
  on public.partner_announcements for select
  using (
    target = 'all'
    or (target = 'specific' and target_partner_id = auth.uid())
    or (
      target in ('industry', 'government')
      and target = (select partner_type from public.profiles where id = auth.uid())
    )
  );
