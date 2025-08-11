-- Invites schema rework migration
-- Add new columns if not exist
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS uses_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS inviter_first_name text,
  ADD COLUMN IF NOT EXISTS inviter_last_name text,
  ADD COLUMN IF NOT EXISTS inviter_email text;

-- Migrate data from old 'uses' to 'uses_count' when applicable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invites' AND column_name = 'uses'
  ) THEN
    EXECUTE 'UPDATE public.invites SET uses_count = COALESCE(uses, 0) WHERE uses_count = 0';
  END IF;
END $$;

-- Drop old 'uses' column if exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'invites' AND column_name = 'uses'
  ) THEN
    EXECUTE 'ALTER TABLE public.invites DROP COLUMN uses';
  END IF;
END $$;

-- Ensure unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS invites_token_key ON public.invites (token);

-- Index on parent_contact_id for quick lookups
CREATE INDEX IF NOT EXISTS idx_invites_parent ON public.invites (parent_contact_id);

-- Ensure default for max_uses is 0 (unlimited)
ALTER TABLE public.invites
  ALTER COLUMN max_uses SET DEFAULT 0;
