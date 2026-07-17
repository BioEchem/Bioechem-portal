-- Adds per-partner document folders on top of the existing partner_documents table.
-- Run this once in the Supabase SQL editor.
--
-- Existing rows (partner_id IS NULL) keep working unchanged as the broadcast
-- "Documents" list shared with every industry partner. New rows with
-- partner_id set belong to that partner's private folder.

alter table public.partner_documents
  add column if not exists partner_id uuid references public.profiles(id) on delete cascade;

create index if not exists partner_documents_partner_id_idx
  on public.partner_documents(partner_id);

-- Widen the category check constraint to include the folder sub-categories.
alter table public.partner_documents
  drop constraint if exists partner_documents_category_check;

alter table public.partner_documents
  add constraint partner_documents_category_check
  check (category in (
    'general', 'report', 'impact',                          -- broadcast categories (unchanged)
    'meeting_followup', 'contract', 'invoice',               -- per-partner folder categories
    'payment_proof', 'grant_app', 'other'
  ));

-- RLS: an industry partner may see/manage rows in their own folder in
-- addition to the existing "published broadcast doc" policy. Admins already
-- bypass RLS via is_bioechem_admin() in the existing policies — adjust the
-- policy names below if your project uses different ones.
drop policy if exists "partners can view own folder docs" on public.partner_documents;
create policy "partners can view own folder docs"
  on public.partner_documents for select
  using (partner_id = auth.uid());

drop policy if exists "partners can upload to own folder" on public.partner_documents;
create policy "partners can insert into own folder"
  on public.partner_documents for insert
  with check (partner_id = auth.uid() and created_by = auth.uid());
