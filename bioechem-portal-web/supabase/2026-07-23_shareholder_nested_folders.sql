-- Turns each shareholder's flat document folder into a real nested-folder
-- tree (like a mini Drive): admins can create folders, navigate into them,
-- and upload documents inside. Shareholders can navigate + download only.
-- Run this once in the Supabase SQL editor.

create table if not exists public.shareholder_folders (
  id uuid primary key default gen_random_uuid(),
  shareholder_id uuid not null references public.profiles(id) on delete cascade,
  parent_folder_id uuid references public.shareholder_folders(id) on delete cascade,
  name text not null,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists shareholder_folders_shareholder_id_idx
  on public.shareholder_folders(shareholder_id);
create index if not exists shareholder_folders_parent_folder_id_idx
  on public.shareholder_folders(parent_folder_id);

alter table public.shareholder_documents
  add column if not exists folder_id uuid references public.shareholder_folders(id) on delete set null;

create index if not exists shareholder_documents_folder_id_idx
  on public.shareholder_documents(folder_id);

alter table public.shareholder_folders enable row level security;

drop policy if exists "shareholder_folders_admin_all" on public.shareholder_folders;
create policy "shareholder_folders_admin_all"
  on public.shareholder_folders for all
  using (public.is_bioechem_admin())
  with check (public.is_bioechem_admin());

drop policy if exists "shareholder_folders_read_own" on public.shareholder_folders;
create policy "shareholder_folders_read_own"
  on public.shareholder_folders for select
  using (shareholder_id = auth.uid());
