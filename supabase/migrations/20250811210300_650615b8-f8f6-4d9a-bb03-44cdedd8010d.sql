-- Fix the remaining_uses ambiguity in UPDATE statement
CREATE OR REPLACE FUNCTION public.accept_invite_and_add_contact(p_token text, p_contact jsonb)
 RETURNS TABLE(contact_id uuid, remaining_uses integer, chain_status text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
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
    SET remaining_uses = invite_chains.remaining_uses - 1,
        status = CASE WHEN invite_chains.remaining_uses - 1 <= 0 THEN 'revoked' ELSE invite_chains.status END
    WHERE id = v_chain.id
    RETURNING * INTO v_chain;
  END IF;

  -- Optionally revoke used invite when chain exhausted
  IF v_chain.max_uses > 0 AND v_chain.remaining_uses = 0 THEN
    UPDATE public.invites SET status = 'revoked' WHERE id = v_invite.id;
  END IF;

  -- Return with fully qualified column references
  RETURN QUERY SELECT v_contact_id, v_chain.remaining_uses, v_chain.status;
END;
$function$