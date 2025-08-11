-- 1) Create invite_chains table
CREATE TABLE IF NOT EXISTS public.invite_chains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  max_uses integer NOT NULL,
  remaining_uses integer NOT NULL,
  status text NOT NULL DEFAULT 'active', -- 'active' | 'revoked'
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Add chain_id to invites (nullable first for backfill)
ALTER TABLE public.invites
ADD COLUMN IF NOT EXISTS chain_id uuid;

-- 3) Backfill chain_id for existing rows
UPDATE public.invites
SET chain_id = gen_random_uuid()
WHERE chain_id IS NULL;

-- 4) Insert chains for existing invites that don't yet have a chain row
INSERT INTO public.invite_chains (id, max_uses, remaining_uses, status)
SELECT i.chain_id,
       COALESCE(i.max_uses, 0) AS max_uses,
       CASE 
         WHEN COALESCE(i.max_uses, 0) = 0 THEN 0 -- unlimited chains ignore remaining_uses
         ELSE GREATEST(COALESCE(i.max_uses, 0) - COALESCE(i.uses_count, 0), 0)
       END AS remaining_uses,
       CASE 
         WHEN i.status <> 'active' THEN 'revoked'
         WHEN COALESCE(i.max_uses, 0) > 0 AND COALESCE(i.uses_count, 0) >= COALESCE(i.max_uses, 0) THEN 'revoked'
         ELSE 'active'
       END AS status
FROM public.invites i
WHERE i.chain_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.invite_chains c WHERE c.id = i.chain_id
  );

-- 5) Add NOT NULL and FK constraint + index
ALTER TABLE public.invites
ALTER COLUMN chain_id SET NOT NULL;

ALTER TABLE public.invites
ADD CONSTRAINT invites_chain_id_fkey
FOREIGN KEY (chain_id) REFERENCES public.invite_chains(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS invites_chain_id_idx ON public.invites(chain_id);

-- 6) Transactional function to accept invite and add contact atomically
--    Handles chain status/remaining_uses updates safely
CREATE OR REPLACE FUNCTION public.accept_invite_and_add_contact(
  p_token text,
  p_contact jsonb
)
RETURNS TABLE(contact_id uuid, remaining_uses integer, chain_status text) AS $$
DECLARE
  v_invite public.invites%ROWTYPE;
  v_chain public.invite_chains%ROWTYPE;
  v_contact_id uuid;
  v_services text[] := ARRAY(SELECT jsonb_array_elements_text(p_contact->'services'));
  v_tags text[] := ARRAY(SELECT jsonb_array_elements_text(p_contact->'tags'));
  v_relationship_degree int := COALESCE((p_contact->>'relationship_degree')::int, 0);
BEGIN
  -- Lock invite and chain rows
  SELECT * INTO v_invite
  FROM public.invites
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Geçersiz davet';
  END IF;

  SELECT * INTO v_chain
  FROM public.invite_chains
  WHERE id = v_invite.chain_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Geçersiz davet zinciri';
  END IF;

  -- Validate statuses and usage
  IF v_invite.status <> 'active' OR v_chain.status <> 'active' THEN
    RAISE EXCEPTION 'Davet kullanım hakkı dolmuş';
  END IF;

  IF v_chain.max_uses > 0 AND v_chain.remaining_uses <= 0 THEN
    RAISE EXCEPTION 'Davet kullanım hakkı dolmuş';
  END IF;

  IF v_invite.inviter_contact_id IS NULL THEN
    RAISE EXCEPTION 'Davet gönderen doğrulanmadı';
  END IF;

  -- Insert contact under the invite owner and link to inviter as parent
  INSERT INTO public.contacts (
    user_id,
    parent_contact_id,
    first_name,
    last_name,
    city,
    profession,
    relationship_degree,
    services,
    tags,
    phone,
    email,
    description
  ) VALUES (
    v_invite.owner_user_id,
    v_invite.inviter_contact_id,
    COALESCE(p_contact->>'first_name', ''),
    COALESCE(p_contact->>'last_name', ''),
    NULLIF(p_contact->>'city', ''),
    NULLIF(p_contact->>'profession', ''),
    v_relationship_degree,
    COALESCE(v_services, ARRAY[]::text[]),
    COALESCE(v_tags, ARRAY[]::text[]),
    NULLIF(p_contact->>'phone', ''),
    NULLIF(p_contact->>'email', ''),
    NULLIF(p_contact->>'description', '')
  )
  RETURNING id INTO v_contact_id;

  -- Decrement chain remaining uses if limited, revoke when hitting zero
  IF v_chain.max_uses > 0 THEN
    UPDATE public.invite_chains
    SET remaining_uses = remaining_uses - 1,
        status = CASE WHEN remaining_uses - 1 <= 0 THEN 'revoked' ELSE status END
    WHERE id = v_chain.id
    RETURNING * INTO v_chain;
  END IF;

  -- Optionally revoke used invite when chain exhausted
  IF v_chain.max_uses > 0 AND v_chain.remaining_uses = 0 THEN
    UPDATE public.invites SET status = 'revoked' WHERE id = v_invite.id;
  END IF;

  RETURN QUERY SELECT v_contact_id, v_chain.remaining_uses, v_chain.status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;