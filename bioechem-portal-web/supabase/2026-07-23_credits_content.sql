-- Admin-editable content for the /credits info page.
-- Single-row table — the row with the lowest created_at is treated as
-- canonical (the app always upserts onto the first row it finds).
-- Run this once in the Supabase SQL editor.

create table if not exists public.credits_page_content (
  id          uuid        primary key default gen_random_uuid(),
  intro_text  text        not null,
  claim_text  text        not null,
  actions     jsonb       not null default '[]'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);

alter table public.credits_page_content enable row level security;

-- Every approved user can read it (it's shown on a page inside the portal).
drop policy if exists "credits_content_read" on public.credits_page_content;
create policy "credits_content_read"
  on public.credits_page_content for select
  using (public.is_approved());

-- Only bioechem admins can write it.
drop policy if exists "credits_content_admin_write" on public.credits_page_content;
create policy "credits_content_admin_write"
  on public.credits_page_content for all
  using (public.is_bioechem_admin())
  with check (public.is_bioechem_admin());

-- Seed the default row (matches what was previously hardcoded) if empty.
insert into public.credits_page_content (intro_text, claim_text, actions)
select
  'BioEchem wants to recognize students and teachers who stay active and engaged on the portal — keeping your profile current, sharing feedback, and following through on your program. Every time you do one of the actions below, you earn credits. Credits can later be redeemed for reimbursement (e.g. program-related expenses) or to purchase BioEchem items.',
  'Since this isn''t automated yet, keep a note of what you did and when (e.g. "updated my career path on March 3"), then email us to claim your credits.',
  '[
    {"action": "Update your Career Path & Interests", "credits": "1 credit", "note": "Each time you meaningfully update it in a cohort — e.g. new interests, plans, or an attached document."},
    {"action": "Submit program feedback or a survey", "credits": "2 credits", "note": "Halfway, final, or custom surveys sent by BioEchem."},
    {"action": "Complete your profile & background", "credits": "1 credit", "note": "Filling in your background section (education, work experience, etc.) once it''s fully complete."},
    {"action": "Complete a program / earn a certificate", "credits": "5 credits", "note": "Awarded when you finish a cohort and receive your certificate."}
  ]'::jsonb
where not exists (select 1 from public.credits_page_content);
