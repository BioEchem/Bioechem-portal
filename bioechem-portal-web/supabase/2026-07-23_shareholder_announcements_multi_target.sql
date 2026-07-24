-- Upgrades shareholder announcement targeting from "all" or one specific
-- shareholder to "all" or a multi-select subset of shareholders, matching
-- the shared_with array pattern already used on shareholder_documents.
-- Run this once in the Supabase SQL editor.

alter table public.shareholder_announcements
  add column if not exists target_shareholder_ids uuid[];

update public.shareholder_announcements
  set target_shareholder_ids = array[target_shareholder_id]
  where target = 'specific' and target_shareholder_id is not null and target_shareholder_ids is null;

drop policy if exists "shareholder_announcements_read" on public.shareholder_announcements;

alter table public.shareholder_announcements
  drop column if exists target_shareholder_id;

create policy "shareholder_announcements_read"
  on public.shareholder_announcements for select
  using (
    target = 'all'
    or (target = 'specific' and auth.uid() = any(target_shareholder_ids))
  );
