-- Lets admins send a message (text + optional file) to all shareholders or
-- one specific shareholder, separate from the formal Documents library.
-- Run this once in the Supabase SQL editor.

create table if not exists public.shareholder_announcements (
  id                     uuid        primary key default gen_random_uuid(),
  title                  text        not null,
  body                   text        not null,
  target                 text        not null check (target in ('all', 'specific')),
  target_shareholder_id  uuid        references public.profiles(id) on delete cascade,
  storage_path           text,
  file_name              text,
  size_bytes             bigint,
  mime_type              text,
  created_by             uuid        not null references public.profiles(id),
  created_at             timestamptz not null default now()
);

create index if not exists shareholder_announcements_target_shareholder_id_idx
  on public.shareholder_announcements(target_shareholder_id);

alter table public.shareholder_announcements enable row level security;

drop policy if exists "shareholder_announcements_admin_all" on public.shareholder_announcements;
create policy "shareholder_announcements_admin_all"
  on public.shareholder_announcements for all
  using (public.is_bioechem_admin())
  with check (public.is_bioechem_admin());

drop policy if exists "shareholder_announcements_read" on public.shareholder_announcements;
create policy "shareholder_announcements_read"
  on public.shareholder_announcements for select
  using (
    target = 'all'
    or (target = 'specific' and target_shareholder_id = auth.uid())
  );
