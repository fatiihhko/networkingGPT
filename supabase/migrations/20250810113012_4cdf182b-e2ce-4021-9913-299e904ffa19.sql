-- Add parent_contact_id to contacts for hierarchical relations
alter table public.contacts
  add column if not exists parent_contact_id uuid references public.contacts(id) on delete set null;

create index if not exists idx_contacts_parent on public.contacts(parent_contact_id);

-- Create invites table
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  parent_contact_id uuid references public.contacts(id) on delete set null,
  max_uses integer not null default 1,
  uses integer not null default 0,
  created_at timestamptz not null default now()
);

alter table public.invites enable row level security;

-- RLS: only authenticated users may manage invites (admin in our app)
create policy "Authenticated can read invites" on public.invites
for select using (auth.role() = 'authenticated');

create policy "Authenticated can insert invites" on public.invites
for insert with check (auth.role() = 'authenticated');

create policy "Authenticated can update invites" on public.invites
for update using (auth.role() = 'authenticated');

create policy "Authenticated can delete invites" on public.invites
for delete using (auth.role() = 'authenticated');