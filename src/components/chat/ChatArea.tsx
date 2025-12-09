import { useState, useEffect, useCallback } from 'react';
import { Hash, Lock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Channel, Message, Profile } from '@/types/chat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { ThreadView } from './ThreadView';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { ChannelMembersDialog } from './ChannelMembersDialog';
import { analyzeContent } from '@/lib/codeDetection';

interface ChatAreaProps {
  channel: Channel | null;
}

const PAGE_SIZE = 50;

export function ChatArea({ channel }: ChatAreaProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [showMembers, setShowMembers] = useState(false);
  const [memberCount, setMemberCount] = useState(0);
  const [activeThread, setActiveThread] = useState<Message | null>(null);

  const fetchProfiles = async (userIds: string[]) => {
    const uniqueIds = [...new Set(userIds)].filter(id => !profiles[id]);
    if (uniqueIds.length === 0) return;

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .in('id', uniqueIds);

    if (data) {
      const newProfiles = data.reduce((acc, profile) => {
        acc[profile.id] = profile as Profile;
        return acc;
      }, {} as Record<string, Profile>);
      
      setProfiles(prev => ({ ...prev, ...newProfiles }));
    }
  };

  const fetchMessages = useCallback(async (offset = 0) => {
    if (!channel) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('channel_id', channel.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) throw error;

      if (data) {
        const sortedMessages = data.reverse();
        if (offset === 0) {
          setMessages(sortedMessages as Message[]);
        } else {
          setMessages(prev => [...sortedMessages as Message[], ...prev]);
        }
        setHasMore(data.length === PAGE_SIZE);
        
        const userIds = data.map(m => m.user_id);
        await fetchProfiles(userIds);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading messages',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [channel]);

  const fetchMemberCount = async () => {
    if (!channel) return;
    
    const { count } = await supabase
      .from('channel_members')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channel.id);
    
    setMemberCount(count || 0);
  };

  useEffect(() => {
    if (channel) {
      setMessages([]);
      setHasMore(true);
      fetchMessages(0);
      fetchMemberCount();
    }
  }, [channel?.id]);

  useEffect(() => {
    if (!channel) return;

    const subscription = supabase
      .channel(`messages:${channel.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `channel_id=eq.${channel.id}`
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
          await fetchProfiles([newMessage.user_id]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [channel?.id]);

  const handleSendMessage = async (content: string) => {
    if (!channel || !user) return;

    // Check if content should auto-thread
    const contentAnalysis = analyzeContent(content);

    // Join channel if not a member (for public channels)
    if (!channel.is_private) {
      const { data: existingMember } = await supabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', channel.id)
        .eq('user_id', user.id)
        .single();

      if (!existingMember) {
        await supabase.from('channel_members').insert({
          channel_id: channel.id,
          user_id: user.id,
          role: 'member'
        });
      }
    }

    const { data: newMessage, error } = await supabase.from('messages').insert({
      channel_id: channel.id,
      user_id: user.id,
      content
    }).select().single();

    if (error) {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive'
      });
      return;
    }

    // Auto-open thread for code/error messages
    if (contentAnalysis.shouldThread && newMessage) {
      setActiveThread(newMessage as Message);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchMessages(messages.length);
    }
  };

  const handleOpenThread = (message: Message) => {
    setActiveThread(message);
  };

  const handleFetchProfiles = useCallback((userIds: string[]) => {
    fetchProfiles(userIds);
  }, []);

  if (!channel) {
    return (
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center text-muted-foreground">
          <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">Select a channel</p>
          <p className="text-sm">Choose a channel from the sidebar to start chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex bg-background">
      <div className="flex-1 flex flex-col">
        {/* Channel Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border glass-panel">
          <div className="flex items-center gap-3">
            {channel.is_private ? (
              <Lock className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Hash className="h-5 w-5 text-muted-foreground" />
            )}
            <div>
              <h2 className="font-semibold">{channel.name}</h2>
              {channel.description && (
                <p className="text-xs text-muted-foreground truncate max-w-md">
                  {channel.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShowMembers(true)}
            >
              <Users className="h-4 w-4 mr-2" />
              {memberCount}
            </Button>
          </div>
        </div>

        {/* Messages */}
        <MessageList 
          messages={messages}
          profiles={profiles}
          loading={loading}
          hasMore={hasMore}
          onLoadMore={handleLoadMore}
          onOpenThread={handleOpenThread}
        />

        {/* Message Input */}
        <MessageInput 
          onSend={handleSendMessage}
          placeholder={`Message #${channel.name}`}
        />

        <ChannelMembersDialog 
          open={showMembers}
          onOpenChange={setShowMembers}
          channel={channel}
        />
      </div>

      {/* Thread Panel */}
      {activeThread && (
        <ThreadView
          parentMessage={activeThread}
          profiles={profiles}
          onClose={() => setActiveThread(null)}
          onProfilesFetch={handleFetchProfiles}
        />
      )}
    </div>
  );
}