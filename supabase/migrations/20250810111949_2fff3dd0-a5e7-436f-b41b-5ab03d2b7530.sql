-- Create contacts table for Networking GPT
create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  first_name text not null,
  last_name text not null,
  city text,
  relationship_degree integer not null default 0,
  services text[] not null default '{}',
  tags text[] not null default '{}',
  phone text,
  email text,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.contacts enable row level security;

-- Policies: only owner (auth.uid) can CRUD
create policy "Users can view their own contacts" on public.contacts
for select using (auth.uid() = user_id);

create policy "Users can insert their own contacts" on public.contacts
for insert with check (auth.uid() = user_id);

create policy "Users can update their own contacts" on public.contacts
for update using (auth.uid() = user_id);

create policy "Users can delete their own contacts" on public.contacts
for delete using (auth.uid() = user_id);

-- Trigger to auto-update updated_at
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_contacts_updated_at
before update on public.contacts
for each row
execute function public.update_updated_at_column();