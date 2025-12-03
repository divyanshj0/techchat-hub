-- Drop existing problematic policy on channels
DROP POLICY IF EXISTS "Public channels are viewable by authenticated users" ON public.channels;

-- Recreate using security definer function
CREATE POLICY "Public channels are viewable by authenticated users" 
ON public.channels 
FOR SELECT 
USING (
  is_private = false 
  OR public.is_channel_member(auth.uid(), id)
);