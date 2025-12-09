import { useState, useEffect, useCallback } from 'react';
import { X, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Message, Profile } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MessageInput } from './MessageInput';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageContent } from './MessageContent';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';

interface ThreadViewProps {
  parentMessage: Message;
  profiles: Record<string, Profile>;
  onClose: () => void;
  onProfilesFetch: (userIds: string[]) => void;
}

export function ThreadView({ 
  parentMessage, 
  profiles, 
  onClose,
  onProfilesFetch 
}: ThreadViewProps) {
  const { user } = useAuth();
  const [replies, setReplies] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReplies = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('parent_id', parentMessage.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        setReplies(data as Message[]);
        const userIds = data.map(m => m.user_id);
        onProfilesFetch(userIds);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading replies',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [parentMessage.id, onProfilesFetch]);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  useEffect(() => {
    const subscription = supabase
      .channel(`thread:${parentMessage.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `parent_id=eq.${parentMessage.id}`
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          setReplies(prev => [...prev, newMessage]);
          onProfilesFetch([newMessage.user_id]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [parentMessage.id, onProfilesFetch]);

  const handleSendReply = async (content: string) => {
    if (!user) return;

    const { error } = await supabase.from('messages').insert({
      channel_id: parentMessage.channel_id,
      user_id: user.id,
      content,
      parent_id: parentMessage.id,
    });

    if (error) {
      toast({
        title: 'Error sending reply',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const parentProfile = profiles[parentMessage.user_id];
  const isOwnMessage = parentMessage.user_id === user?.id;

  return (
    <div className="w-80 border-l border-border bg-background flex flex-col h-full">
      {/* Header */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-border">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-sm">Thread</span>
          <span className="text-xs text-muted-foreground">
            {replies.length} repl{replies.length !== 1 ? 'ies' : 'y'}
          </span>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Parent Message */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarFallback className={cn(
              "text-xs",
              isOwnMessage ? "bg-primary text-primary-foreground" : "bg-secondary"
            )}>
              {parentProfile?.username?.charAt(0).toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-1">
              <span className={cn(
                "font-medium text-sm",
                isOwnMessage && "text-primary"
              )}>
                {parentProfile?.username || 'Unknown'}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(new Date(parentMessage.created_at), 'h:mm a')}
              </span>
            </div>
            <div className="text-sm text-foreground/90">
              <MessageContent content={parentMessage.content} />
            </div>
          </div>
        </div>
      </div>

      {/* Replies */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="text-center text-muted-foreground text-sm">Loading...</div>
        ) : replies.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No replies yet. Start the conversation!
          </div>
        ) : (
          replies.map((reply) => {
            const profile = profiles[reply.user_id];
            const isOwn = reply.user_id === user?.id;
            
            return (
              <div key={reply.id} className="flex gap-3">
                <Avatar className="h-6 w-6 flex-shrink-0">
                  <AvatarFallback className={cn(
                    "text-xs",
                    isOwn ? "bg-primary text-primary-foreground" : "bg-secondary"
                  )}>
                    {profile?.username?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5">
                    <span className={cn(
                      "font-medium text-xs",
                      isOwn && "text-primary"
                    )}>
                      {profile?.username || 'Unknown'}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(reply.created_at), 'h:mm a')}
                    </span>
                  </div>
                  <div className="text-sm text-foreground/90">
                    <MessageContent content={reply.content} />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Reply Input */}
      <MessageInput 
        onSend={handleSendReply}
        placeholder="Reply in thread..."
      />
    </div>
  );
}
