import { useRef, useEffect } from 'react';
import { Message, Profile } from '@/types/chat';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format, isToday, isYesterday } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface MessageListProps {
  messages: Message[];
  profiles: Record<string, Profile>;
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
}

export function MessageList({ 
  messages, 
  profiles, 
  loading, 
  hasMore, 
  onLoadMore 
}: MessageListProps) {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleScroll = () => {
    if (!containerRef.current || loading || !hasMore) return;
    
    if (containerRef.current.scrollTop === 0) {
      onLoadMore();
    }
  };

  const formatMessageDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`;
    return format(date, 'MMM d, h:mm a');
  };

  const groupMessagesByDate = (messages: Message[]) => {
    const groups: { date: string; messages: Message[] }[] = [];
    let currentDate = '';

    messages.forEach((message) => {
      const messageDate = format(new Date(message.created_at), 'yyyy-MM-dd');
      if (messageDate !== currentDate) {
        currentDate = messageDate;
        groups.push({ date: messageDate, messages: [] });
      }
      groups[groups.length - 1].messages.push(message);
    });

    return groups;
  };

  const formatDateDivider = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return 'Today';
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMMM d, yyyy');
  };

  const groupedMessages = groupMessagesByDate(messages);

  return (
    <div 
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 scrollbar-thin"
      onScroll={handleScroll}
    >
      {loading && hasMore && (
        <div className="flex justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {groupedMessages.map((group) => (
        <div key={group.date}>
          <div className="flex items-center gap-4 my-4">
            <div className="flex-1 h-px bg-border" />
            <span className="text-xs text-muted-foreground font-medium">
              {formatDateDivider(group.date)}
            </span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-4">
            {group.messages.map((message, idx) => {
              const profile = profiles[message.user_id];
              const isOwn = message.user_id === user?.id;
              const showAvatar = idx === 0 || 
                group.messages[idx - 1].user_id !== message.user_id;

              return (
                <div 
                  key={message.id} 
                  className={cn(
                    "flex gap-3 animate-slide-up",
                    !showAvatar && "pl-11"
                  )}
                >
                  {showAvatar && (
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className={cn(
                        "text-xs",
                        isOwn ? "bg-primary text-primary-foreground" : "bg-secondary"
                      )}>
                        {profile?.username?.charAt(0).toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1 min-w-0">
                    {showAvatar && (
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className={cn(
                          "font-medium text-sm",
                          isOwn && "text-primary"
                        )}>
                          {profile?.username || 'Unknown'}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatMessageDate(message.created_at)}
                        </span>
                      </div>
                    )}
                    <div className={cn(
                      "text-sm text-foreground/90 break-words",
                      isOwn ? "message-bubble-own inline-block" : ""
                    )}>
                      {message.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {messages.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
          <p className="text-lg font-medium">No messages yet</p>
          <p className="text-sm">Be the first to start the conversation!</p>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}