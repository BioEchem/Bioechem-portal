-- Adds a contact title/role (e.g. "Program Coordinator") alongside the
-- existing contact_name / contact_email / contact_phone on schools.
-- Run this once in the Supabase SQL editor.

alter table public.schools
  add column if not exists contact_title text;
