-- Create security definer function to check channel membership
CREATE OR REPLACE FUNCTION public.is_channel_member(_user_id uuid, _channel_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channel_members
    WHERE user_id = _user_id
      AND channel_id = _channel_id
  )
$$;

-- Create security definer function to check channel role
CREATE OR REPLACE FUNCTION public.has_channel_role(_user_id uuid, _channel_id uuid, _roles channel_role[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.channel_members
    WHERE user_id = _user_id
      AND channel_id = _channel_id
      AND role = ANY(_roles)
  )
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Members can view channel members" ON public.channel_members;
DROP POLICY IF EXISTS "Admins can manage channel members" ON public.channel_members;
DROP POLICY IF EXISTS "Admins can remove members" ON public.channel_members;

-- Recreate policies using security definer functions
CREATE POLICY "Members can view channel members" 
ON public.channel_members 
FOR SELECT 
USING (
  public.is_channel_member(auth.uid(), channel_id) 
  OR EXISTS (SELECT 1 FROM public.channels WHERE id = channel_id AND is_private = false)
);

CREATE POLICY "Admins can manage channel members" 
ON public.channel_members 
FOR INSERT 
WITH CHECK (
  public.has_channel_role(auth.uid(), channel_id, ARRAY['admin'::channel_role, 'moderator'::channel_role])
  OR (auth.uid() = user_id)
);

CREATE POLICY "Admins can remove members" 
ON public.channel_members 
FOR DELETE 
USING (
  public.has_channel_role(auth.uid(), channel_id, ARRAY['admin'::channel_role])
  OR (user_id = auth.uid())
);