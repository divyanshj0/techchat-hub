import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Hash, Search, Users, Check } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
}

interface JoinChannelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JoinChannelDialog({ open, onOpenChange }: JoinChannelDialogProps) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [channels, setChannels] = useState<Channel[]>([]);
  const [joinedChannelIds, setJoinedChannelIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    if (open && user) {
      fetchChannels();
      fetchJoinedChannels();
    }
  }, [open, user]);

  const fetchChannels = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('channels')
      .select('id, name, description, is_private')
      .eq('is_private', false)
      .order('name');

    if (data) {
      setChannels(data);
    }
    setLoading(false);
  };

  const fetchJoinedChannels = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('channel_members')
      .select('channel_id')
      .eq('user_id', user.id);

    if (data) {
      setJoinedChannelIds(new Set(data.map(m => m.channel_id)));
    }
  };

  const handleJoin = async (channelId: string, channelName: string) => {
    if (!user) return;

    setJoining(channelId);
    try {
      const { error } = await supabase
        .from('channel_members')
        .insert({
          channel_id: channelId,
          user_id: user.id,
          role: 'member'
        });

      if (error) throw error;

      setJoinedChannelIds(prev => new Set([...prev, channelId]));
      toast({
        title: 'Joined channel',
        description: `You've joined #${channelName}`
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to join channel',
        variant: 'destructive'
      });
    } finally {
      setJoining(null);
    }
  };

  const filteredChannels = channels.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase().trim())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Join a Channel</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search channels..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-secondary border-border pl-9"
            maxLength={50}
          />
        </div>

        <ScrollArea className="h-[300px] -mx-6 px-6">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Loading channels...
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Hash className="h-8 w-8 mb-2 opacity-50" />
              <p>No channels found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredChannels.map((channel) => {
                const isJoined = joinedChannelIds.has(channel.id);
                const isJoining = joining === channel.id;

                return (
                  <div
                    key={channel.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Hash className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground truncate">
                        #{channel.name}
                      </p>
                      {channel.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {channel.description}
                        </p>
                      )}
                    </div>
                    {isJoined ? (
                      <div className="flex items-center gap-1 text-sm text-green-500">
                        <Check className="h-4 w-4" />
                        <span>Joined</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => handleJoin(channel.id, channel.name)}
                        disabled={isJoining}
                      >
                        {isJoining ? 'Joining...' : 'Join'}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
