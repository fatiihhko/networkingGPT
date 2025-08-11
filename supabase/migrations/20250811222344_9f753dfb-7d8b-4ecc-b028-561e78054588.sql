-- Create new invite_links table for the admin-controlled invite system
CREATE TABLE public.invite_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by_user_id UUID NOT NULL,
  name TEXT NOT NULL DEFAULT 'Davet Bağlantısı',
  limit_count INTEGER NOT NULL DEFAULT 1,
  used_count INTEGER NOT NULL DEFAULT 0,
  token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invite_members table to track who was added via each invite link
CREATE TABLE public.invite_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invite_link_id UUID NOT NULL REFERENCES public.invite_links(id) ON DELETE CASCADE,
  inviter_user_id UUID NOT NULL,
  member_email TEXT NOT NULL,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Prevent duplicate email per invite link
  UNIQUE(invite_link_id, member_email)
);

-- Enable RLS
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_members ENABLE ROW LEVEL SECURITY;

-- RLS Policies for invite_links
CREATE POLICY "Users can view their own invite links" 
ON public.invite_links 
FOR SELECT 
USING (auth.uid() = created_by_user_id);

CREATE POLICY "Users can create their own invite links" 
ON public.invite_links 
FOR INSERT 
WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Users can update their own invite links" 
ON public.invite_links 
FOR UPDATE 
USING (auth.uid() = created_by_user_id);

CREATE POLICY "Users can delete their own invite links" 
ON public.invite_links 
FOR DELETE 
USING (auth.uid() = created_by_user_id);

-- RLS Policies for invite_members
CREATE POLICY "Users can view members of their invite links" 
ON public.invite_members 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.invite_links 
  WHERE invite_links.id = invite_members.invite_link_id 
  AND invite_links.created_by_user_id = auth.uid()
));

CREATE POLICY "Authenticated users can insert invite members" 
ON public.invite_members 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated');

-- Add triggers for updated_at
CREATE TRIGGER update_invite_links_updated_at
BEFORE UPDATE ON public.invite_links
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to add member via invite link
CREATE OR REPLACE FUNCTION public.add_member_via_invite_link(
  p_token text,
  p_inviter_user_id uuid,
  p_member_email text,
  p_contact_data jsonb
)
RETURNS TABLE(success boolean, contact_id uuid, remaining_slots integer, error_message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_invite_link public.invite_links%ROWTYPE;
  v_contact_id uuid;
  v_remaining integer;
BEGIN
  -- Lock the invite link row
  SELECT * INTO v_invite_link
  FROM public.invite_links
  WHERE token = p_token AND status = 'active'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, null::uuid, 0, 'Geçersiz veya devre dışı davet bağlantısı';
    RETURN;
  END IF;

  -- Check if limit reached
  IF v_invite_link.used_count >= v_invite_link.limit_count THEN
    RETURN QUERY SELECT false, null::uuid, (v_invite_link.limit_count - v_invite_link.used_count), 'Davet bağlantısı kullanım limitine ulaştı';
    RETURN;
  END IF;

  -- Check if email already exists for this invite link
  IF EXISTS (
    SELECT 1 FROM public.invite_members 
    WHERE invite_link_id = v_invite_link.id 
    AND member_email = p_member_email
  ) THEN
    RETURN QUERY SELECT false, null::uuid, (v_invite_link.limit_count - v_invite_link.used_count), 'Bu e-posta adresi zaten bu davet bağlantısı ile eklenmiş';
    RETURN;
  END IF;

  -- Create the contact
  INSERT INTO public.contacts (
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
    description
  ) VALUES (
    v_invite_link.created_by_user_id,
    COALESCE(p_contact_data->>'first_name', ''),
    COALESCE(p_contact_data->>'last_name', ''),
    NULLIF(p_contact_data->>'city', ''),
    NULLIF(p_contact_data->>'profession', ''),
    COALESCE((p_contact_data->>'relationship_degree')::int, 0),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_contact_data->'services')), ARRAY[]::text[]),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_contact_data->'tags')), ARRAY[]::text[]),
    NULLIF(p_contact_data->>'phone', ''),
    NULLIF(p_contact_data->>'email', ''),
    NULLIF(p_contact_data->>'description', '')
  )
  RETURNING id INTO v_contact_id;

  -- Add to invite_members
  INSERT INTO public.invite_members (
    invite_link_id,
    inviter_user_id,
    member_email,
    contact_id
  ) VALUES (
    v_invite_link.id,
    p_inviter_user_id,
    p_member_email,
    v_contact_id
  );

  -- Increment used_count
  UPDATE public.invite_links 
  SET used_count = used_count + 1
  WHERE id = v_invite_link.id;

  v_remaining := v_invite_link.limit_count - (v_invite_link.used_count + 1);

  RETURN QUERY SELECT true, v_contact_id, v_remaining, null::text;
END;
$function$;