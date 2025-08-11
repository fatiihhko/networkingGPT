-- Add inviter_contact_id column and index on invites
ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS inviter_contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invites_inviter_contact_id_idx
ON public.invites (inviter_contact_id);
