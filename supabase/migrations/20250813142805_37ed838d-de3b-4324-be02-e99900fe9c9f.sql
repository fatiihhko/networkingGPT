-- RPC fonksiyonu: accept_invite_and_add_contact
-- Bu fonksiyon davet tokenini doğrular ve yeni kişi ekler

CREATE OR REPLACE FUNCTION accept_invite_and_add_contact(
  p_token text,
  p_contact jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_invite record;
  v_chain record;
  v_contact_id uuid;
  v_remaining_uses integer;
  v_chain_status text;
BEGIN
  -- Log the input parameters
  RAISE LOG 'accept_invite_and_add_contact called with token: % and contact: %', p_token, p_contact;

  -- 1. Token ile daveti bul
  SELECT i.*, ic.max_uses as chain_max_uses, ic.remaining_uses as chain_remaining_uses, ic.status as chain_status
  INTO v_invite
  FROM invites i
  JOIN invite_chains ic ON i.chain_id = ic.id
  WHERE i.token = p_token;

  -- Davet bulunamadı
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Davet bulunamadı veya geçersiz token';
  END IF;

  RAISE LOG 'Found invite with id: % and chain status: %', v_invite.id, v_invite.chain_status;

  -- 2. Davet durumunu kontrol et
  IF v_invite.status != 'active' THEN
    RAISE EXCEPTION 'Bu davet artık aktif değil';
  END IF;

  IF v_invite.chain_status != 'active' THEN
    RAISE EXCEPTION 'Bu davet zinciri artık aktif değil';
  END IF;

  -- 3. Kullanım limitini kontrol et (0 = sınırsız)
  IF v_invite.chain_max_uses > 0 AND v_invite.chain_remaining_uses <= 0 THEN
    RAISE EXCEPTION 'Bu davet bağlantısının kullanım hakkı dolmuş';
  END IF;

  -- 4. inviter_contact_id kontrolü
  IF v_invite.inviter_contact_id IS NULL THEN
    RAISE EXCEPTION 'Davet henüz doğrulanmamış. Önce daveti gönderen bilgilerini girin.';
  END IF;

  -- 5. Yeni kişiyi ekle
  INSERT INTO contacts (
    user_id,
    first_name,
    last_name,
    city,
    profession,
    relationship_degree,
    services,
    tags,
    phone,
    email,
    description,
    parent_contact_id
  ) VALUES (
    v_invite.owner_user_id,
    (p_contact->>'first_name')::text,
    (p_contact->>'last_name')::text,
    (p_contact->>'city')::text,
    (p_contact->>'profession')::text,
    (p_contact->>'relationship_degree')::integer,
    CASE 
      WHEN jsonb_typeof(p_contact->'services') = 'array' THEN
        (SELECT array_agg(value::text) FROM jsonb_array_elements_text(p_contact->'services'))
      ELSE 
        '{}'::text[]
    END,
    CASE 
      WHEN jsonb_typeof(p_contact->'tags') = 'array' THEN
        (SELECT array_agg(value::text) FROM jsonb_array_elements_text(p_contact->'tags'))
      ELSE 
        '{}'::text[]
    END,
    (p_contact->>'phone')::text,
    (p_contact->>'email')::text,
    (p_contact->>'description')::text,
    v_invite.inviter_contact_id
  ) RETURNING id INTO v_contact_id;

  RAISE LOG 'Inserted contact with id: %', v_contact_id;

  -- 6. Davet kullanım sayısını artır
  UPDATE invites 
  SET uses_count = uses_count + 1
  WHERE id = v_invite.id;

  -- 7. Zincir kullanım sayısını azalt (eğer sınırlı ise)
  IF v_invite.chain_max_uses > 0 THEN
    UPDATE invite_chains 
    SET remaining_uses = remaining_uses - 1
    WHERE id = v_invite.chain_id
    RETURNING remaining_uses, status INTO v_remaining_uses, v_chain_status;
  ELSE
    v_remaining_uses := NULL; -- Sınırsız
    v_chain_status := v_invite.chain_status;
  END IF;

  RAISE LOG 'Updated chain, remaining_uses: %, status: %', v_remaining_uses, v_chain_status;

  -- 8. Sonucu döndür
  RETURN jsonb_build_object(
    'contact_id', v_contact_id,
    'remaining_uses', v_remaining_uses,
    'chain_status', v_chain_status
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in accept_invite_and_add_contact: %', SQLERRM;
    RAISE;
END;
$$;