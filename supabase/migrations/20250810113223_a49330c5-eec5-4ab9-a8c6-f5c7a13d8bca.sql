-- Add parent_contact_id to contacts for hierarchical relations
alter table public.contacts
  add column if not exists parent_contact_id uuid references public.contacts(id) on delete set null;

create index if not exists idx_contacts_parent on public.contacts(parent_contact_id);

-- Create invites table (id, token, parent_contact_id, owner_user_id, usage tracking)
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  parent_contact_id uuid references public.contacts(id) on delete set null,
  max_uses integer not null default 1,
  uses integer not null default 0,
  created_at timestamptz not null default now(),
  owner_user_id uuid not null
);

-- Helpful index for quick token lookups
create index if not exists idx_invites_token on public.invites(token);

-- Enable Row Level Security
alter table public.invites enable row level security;

-- Policies (create if missing)
DO $$ BEGIN
  CREATE POLICY "Authenticated can read invites" ON public.invites
  FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can insert invites" ON public.invites
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can update invites" ON public.invites
  FOR UPDATE USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated can delete invites" ON public.invites
  FOR DELETE USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;