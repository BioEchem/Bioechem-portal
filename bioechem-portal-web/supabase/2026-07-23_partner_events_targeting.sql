-- Drops partner_programs (unused, superseded by partner_events) and adds
-- audience targeting to partner_events: publish to everyone, government
-- partners, industry partners, or one specific partner — same targeting
-- model already used by partner_announcements.
-- Run this once in the Supabase SQL editor.

drop table if exists public.partner_programs;

alter table public.partner_events
  add column if not exists target text not null default 'all' check (target in ('all', 'industry', 'government', 'specific')),
  add column if not exists target_partner_id uuid references public.profiles(id) on delete cascade;

create index if not exists partner_events_target_partner_id_idx
  on public.partner_events(target_partner_id);

drop policy if exists "partnerevents_read" on public.partner_events;
create policy "partnerevents_read"
  on public.partner_events for select to authenticated
  using (
    published = true
    and (select role::text from public.profiles where id = auth.uid()) in ('industry_partner', 'bioechem_admin')
    and (
      target = 'all'
      or (target = 'specific' and target_partner_id = auth.uid())
      or (
        target in ('industry', 'government')
        and target = (select partner_type from public.profiles where id = auth.uid())
      )
    )
  );
