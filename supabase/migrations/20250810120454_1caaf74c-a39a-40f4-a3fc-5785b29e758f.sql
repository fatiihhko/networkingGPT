-- Add profession column to contacts for stats and display
ALTER TABLE public.contacts
ADD COLUMN IF NOT EXISTS profession TEXT;

-- Keep updated_at fresh on updates if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_contacts_updated_at'
  ) THEN
    CREATE TRIGGER update_contacts_updated_at
    BEFORE UPDATE ON public.contacts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;