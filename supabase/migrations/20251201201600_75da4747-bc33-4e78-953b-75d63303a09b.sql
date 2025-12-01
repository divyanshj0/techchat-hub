-- Create roles enum for channel members
CREATE TYPE public.channel_role AS ENUM ('admin', 'moderator', 'member');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  avatar_url TEXT,
  status TEXT DEFAULT 'offline',
  last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create channels table
CREATE TABLE public.channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_private BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create channel members table
CREATE TABLE public.channel_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role channel_role DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Channels policies
CREATE POLICY "Public channels are viewable by authenticated users" ON public.channels
  FOR SELECT TO authenticated
  USING (is_private = false OR id IN (
    SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create channels" ON public.channels
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Channel admins can update channels" ON public.channels
  FOR UPDATE TO authenticated
  USING (id IN (
    SELECT channel_id FROM public.channel_members 
    WHERE user_id = auth.uid() AND role = 'admin'
  ));

-- Channel members policies
CREATE POLICY "Members can view channel members" ON public.channel_members
  FOR SELECT TO authenticated
  USING (channel_id IN (
    SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
  ) OR channel_id IN (
    SELECT id FROM public.channels WHERE is_private = false
  ));

CREATE POLICY "Admins can manage channel members" ON public.channel_members
  FOR INSERT TO authenticated
  WITH CHECK (
    channel_id IN (
      SELECT channel_id FROM public.channel_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'moderator')
    ) OR auth.uid() = user_id
  );

CREATE POLICY "Admins can remove members" ON public.channel_members
  FOR DELETE TO authenticated
  USING (
    channel_id IN (
      SELECT channel_id FROM public.channel_members 
      WHERE user_id = auth.uid() AND role = 'admin'
    ) OR user_id = auth.uid()
  );

-- Messages policies
CREATE POLICY "Members can view channel messages" ON public.messages
  FOR SELECT TO authenticated
  USING (channel_id IN (
    SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
  ) OR channel_id IN (
    SELECT id FROM public.channels WHERE is_private = false
  ));

CREATE POLICY "Members can send messages" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND (
      channel_id IN (SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid())
      OR channel_id IN (SELECT id FROM public.channels WHERE is_private = false)
    )
  );

CREATE POLICY "Users can update their own messages" ON public.messages
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages" ON public.messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_channels_updated_at BEFORE UPDATE ON public.channels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Enable realtime for messages and profiles
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;