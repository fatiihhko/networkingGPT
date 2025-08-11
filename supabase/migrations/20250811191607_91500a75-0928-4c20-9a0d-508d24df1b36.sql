-- Enable RLS on invite_chains table (fixing critical security issue)
ALTER TABLE public.invite_chains ENABLE ROW LEVEL SECURITY;

-- Create policies for invite_chains (similar to invites table)
CREATE POLICY "Authenticated can read invite chains" 
ON public.invite_chains 
FOR SELECT 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated can insert invite chains" 
ON public.invite_chains 
FOR INSERT 
WITH CHECK (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated can update invite chains" 
ON public.invite_chains 
FOR UPDATE 
USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Authenticated can delete invite chains" 
ON public.invite_chains 
FOR DELETE 
USING (auth.role() = 'authenticated'::text);