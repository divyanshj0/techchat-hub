import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ChannelSidebar } from '@/components/chat/ChannelSidebar';
import { ChatArea } from '@/components/chat/ChatArea';
import { Channel, Profile } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function Chat() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchChannels();
      fetchOnlineUsers();
      subscribeToPresence();
    }
  }, [user]);

  const fetchChannels = async () => {
    try {
      const { data } = await supabase
        .from('channels')
        .select('*')
        .order('created_at', { ascending: true });

      if (data) {
        setChannels(data as Channel[]);
        if (data.length > 0 && !activeChannel) {
          setActiveChannel(data[0] as Channel);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchOnlineUsers = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('status', 'online');

    if (data) {
      setOnlineUsers(data as Profile[]);
    }
  };

  const subscribeToPresence = () => {
    const subscription = supabase
      .channel('presence-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchOnlineUsers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  useEffect(() => {
    const subscription = supabase
      .channel('channel-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channels'
        },
        () => {
          fetchChannels();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading TechChat...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="h-screen flex bg-background">
      <ChannelSidebar
        channels={channels}
        activeChannel={activeChannel}
        onSelectChannel={setActiveChannel}
        onlineUsers={onlineUsers}
      />
      <ChatArea channel={activeChannel} />
    </div>
  );
}