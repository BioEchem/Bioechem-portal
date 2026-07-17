-- Lets admins share a specific shareholder_documents row with only certain
-- shareholders instead of broadcasting it to everyone.
-- Run this once in the Supabase SQL editor.
--
-- shared_with = null  -> visible to all approved shareholders (today's behavior, unchanged)
-- shared_with = {uuid, uuid, ...} -> visible only to those profile ids

alter table public.shareholder_documents
  add column if not exists shared_with uuid[];

create index if not exists shareholder_documents_shared_with_idx
  on public.shareholder_documents using gin (shared_with);

-- RLS: a shareholder may see a doc if it's published and either broadcast
-- (shared_with is null) or they're explicitly listed. Adjust the policy name
-- below if your project already uses a different one for this table.
drop policy if exists "shareholders can view visible docs" on public.shareholder_documents;
create policy "shareholders can view visible docs"
  on public.shareholder_documents for select
  using (
    published = true
    and (shared_with is null or auth.uid() = any(shared_with))
  );
