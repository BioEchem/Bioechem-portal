-- Adds a contact person name to schools, alongside the existing
-- contact_email / contact_phone columns.
-- Run this once in the Supabase SQL editor.

alter table public.schools
  add column if not exists contact_name text;
