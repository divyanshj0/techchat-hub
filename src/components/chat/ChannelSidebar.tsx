import { useState, useEffect } from 'react';
import { Hash, Lock, Plus, Users, LogOut, Circle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Channel, Profile } from '@/types/chat';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { CreateChannelDialog } from './CreateChannelDialog';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface ChannelSidebarProps {
  channels: Channel[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
}

interface ChannelMemberWithProfile {
  user_id: string;
  role: string;
  profile: Profile;
}

export function ChannelSidebar({ 
  channels, 
  activeChannel, 
  onSelectChannel,
}: ChannelSidebarProps) {
  const { profile, signOut } = useAuth();
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [channelMembers, setChannelMembers] = useState<ChannelMemberWithProfile[]>([]);
  
  const publicChannels = channels.filter(c => !c.is_private);
  const privateChannels = channels.filter(c => c.is_private);

  // Fetch channel members when active channel changes
  useEffect(() => {
    if (!activeChannel) {
      setChannelMembers([]);
      return;
    }

    const fetchChannelMembers = async () => {
      const { data } = await supabase
        .from('channel_members')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            username,
            avatar_url,
            status,
            last_seen
          )
        `)
        .eq('channel_id', activeChannel.id);

      if (data) {
        const members = data.map((member: any) => ({
          user_id: member.user_id,
          role: member.role,
          profile: member.profiles as Profile
        }));
        setChannelMembers(members);
      }
    };

    fetchChannelMembers();

    // Subscribe to profile status changes
    const channel = supabase
      .channel(`channel-members-${activeChannel.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => {
          fetchChannelMembers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'channel_members',
          filter: `channel_id=eq.${activeChannel.id}`
        },
        () => {
          fetchChannelMembers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeChannel?.id]);

  const onlineMembers = channelMembers.filter(m => m.profile?.status === 'online');
  const offlineMembers = channelMembers.filter(m => m.profile?.status !== 'online');

  return (
    <div className="w-64 bg-sidebar flex flex-col border-r border-sidebar-border">
      {/* Header */}
      <div className="p-4 border-b border-sidebar-border">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">TC</span>
          </div>
          TechChat
        </h1>
      </div>

      <ScrollArea className="flex-1 px-2">
        {/* Public Channels */}
        <div className="py-4">
          <div className="flex items-center justify-between px-2 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Public Channels
            </span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-5 w-5 text-muted-foreground hover:text-foreground"
              onClick={() => setShowCreateChannel(true)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="space-y-1">
            {publicChannels.map((channel) => (
              <button
                key={channel.id}
                onClick={() => onSelectChannel(channel)}
                className={cn(
                  "channel-item w-full text-left",
                  activeChannel?.id === channel.id && "channel-item-active"
                )}
              >
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Private Channels */}
        {privateChannels.length > 0 && (
          <div className="py-4 border-t border-sidebar-border">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Private Channels
              </span>
            </div>
            <div className="space-y-1">
              {privateChannels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel)}
                  className={cn(
                    "channel-item w-full text-left",
                    activeChannel?.id === channel.id && "channel-item-active"
                  )}
                >
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Channel Members */}
        {activeChannel && (
          <div className="py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-2 px-2 mb-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Members — {channelMembers.length}
              </span>
            </div>

            {/* Online Members */}
            {onlineMembers.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-2 px-2 mb-2">
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  <span className="text-xs text-muted-foreground">
                    Online — {onlineMembers.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {onlineMembers.map((member) => (
                    <div key={member.user_id} className="flex items-center gap-2 px-2 py-1.5">
                      <div className="relative">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-secondary text-xs">
                            {member.profile?.username?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 presence-dot presence-online" />
                      </div>
                      <span className="text-sm text-foreground truncate flex-1">
                        {member.profile?.username}
                      </span>
                      {member.role === 'admin' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                          Admin
                        </span>
                      )}
                      {member.role === 'moderator' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground">
                          Mod
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Offline Members */}
            {offlineMembers.length > 0 && (
              <div>
                <div className="flex items-center gap-2 px-2 mb-2">
                  <Circle className="h-2 w-2 fill-muted-foreground/50 text-muted-foreground/50" />
                  <span className="text-xs text-muted-foreground">
                    Offline — {offlineMembers.length}
                  </span>
                </div>
                <div className="space-y-1">
                  {offlineMembers.map((member) => (
                    <div key={member.user_id} className="flex items-center gap-2 px-2 py-1.5 opacity-60">
                      <div className="relative">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-secondary text-xs">
                            {member.profile?.username?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="absolute -bottom-0.5 -right-0.5 presence-dot presence-offline" />
                      </div>
                      <span className="text-sm text-muted-foreground truncate flex-1">
                        {member.profile?.username}
                      </span>
                      {member.role === 'admin' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                          Admin
                        </span>
                      )}
                      {member.role === 'moderator' && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent-foreground">
                          Mod
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile?.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-0.5 -right-0.5 presence-dot presence-online" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.username}</p>
            <p className="text-xs text-muted-foreground">Online</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={signOut}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <CreateChannelDialog 
        open={showCreateChannel} 
        onOpenChange={setShowCreateChannel} 
      />
    </div>
  );
}
