-- Per-shareholder private document folders, mirroring the partner folder
-- feature: one folder per shareholder, organized into fixed categories.
-- Admin uploads/publishes into a shareholder's folder; that shareholder is
-- the only one who can see it (view + download only, no self-upload).
-- Run this once in the Supabase SQL editor.
--
-- shareholder_id = null -> broadcast doc (unchanged; governed by shared_with)
-- shareholder_id = X    -> lives in shareholder X's private folder

alter table public.shareholder_documents
  add column if not exists shareholder_id uuid references public.profiles(id) on delete cascade;

create index if not exists shareholder_documents_shareholder_id_idx
  on public.shareholder_documents(shareholder_id);

-- Widen the category check constraint to include the folder categories
-- (mirrors PARTNER_FOLDER_CATEGORIES in lib/partner/folder-categories.ts).
alter table public.shareholder_documents
  drop constraint if exists shareholder_documents_category_check;

alter table public.shareholder_documents
  add constraint shareholder_documents_category_check
  check (category in (
    'general', 'report', 'financial', 'meeting', 'governance',  -- existing broadcast categories
    'meeting_followup', 'contract', 'invoice',                  -- per-shareholder folder categories
    'payment_proof', 'grant_app', 'other'
  ));

-- Extend the read policy so a shareholder can also see docs in their own
-- folder, regardless of the shared_with broadcast list.
drop policy if exists "shareholders can view visible docs" on public.shareholder_documents;
create policy "shareholders can view visible docs"
  on public.shareholder_documents for select
  using (
    published = true
    and (
      shareholder_id = auth.uid()
      or (shareholder_id is null and (shared_with is null or auth.uid() = any(shared_with)))
    )
  );
