-- Turns each partner's flat document folder into a real nested-folder tree
-- (like a mini Drive), mirroring shareholder_folders: admins can create
-- folders, navigate into them, and upload documents inside. Partners can
-- navigate + download, and can still upload into whatever folder they're
-- browsing (self-upload, e.g. a signed W9), but cannot create/delete folders.
-- Run this once in the Supabase SQL editor.

create table if not exists public.partner_folders (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.profiles(id) on delete cascade,
  parent_folder_id uuid references public.partner_folders(id) on delete cascade,
  name text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists partner_folders_partner_id_idx
  on public.partner_folders(partner_id);
create index if not exists partner_folders_parent_folder_id_idx
  on public.partner_folders(parent_folder_id);

alter table public.partner_documents
  add column if not exists folder_id uuid references public.partner_folders(id) on delete set null;

create index if not exists partner_documents_folder_id_idx
  on public.partner_documents(folder_id);

alter table public.partner_folders enable row level security;

drop policy if exists "partner_folders_admin_all" on public.partner_folders;
create policy "partner_folders_admin_all"
  on public.partner_folders for all
  using (public.is_bioechem_admin())
  with check (public.is_bioechem_admin());

drop policy if exists "partner_folders_read_own" on public.partner_folders;
create policy "partner_folders_read_own"
  on public.partner_folders for select
  using (partner_id = auth.uid());
