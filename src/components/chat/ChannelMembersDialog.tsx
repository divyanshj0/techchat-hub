import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Channel, ChannelMember, Profile } from '@/types/chat';
import { supabase } from '@/integrations/supabase/client';
import { Shield, ShieldCheck, User } from 'lucide-react';

interface ChannelMembersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: Channel;
}

export function ChannelMembersDialog({ open, onOpenChange, channel }: ChannelMembersDialogProps) {
  const [members, setMembers] = useState<(ChannelMember & { profile: Profile })[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && channel) {
      fetchMembers();
    }
  }, [open, channel]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const { data: memberData } = await supabase
        .from('channel_members')
        .select('*')
        .eq('channel_id', channel.id);

      if (memberData && memberData.length > 0) {
        const userIds = memberData.map(m => m.user_id);
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);

        const profileMap = (profileData || []).reduce((acc, p) => {
          acc[p.id] = p as Profile;
          return acc;
        }, {} as Record<string, Profile>);

        const membersWithProfiles = memberData.map(m => ({
          ...m,
          role: m.role as 'admin' | 'moderator' | 'member',
          profile: profileMap[m.user_id]
        }));

        setMembers(membersWithProfiles);
      }
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="h-4 w-4 text-primary" />;
      case 'moderator':
        return <Shield className="h-4 w-4 text-warning" />;
      default:
        return <User className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge variant="default" className="text-xs">Admin</Badge>;
      case 'moderator':
        return <Badge variant="secondary" className="text-xs">Mod</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Channel Members ({members.length})</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          <div className="space-y-2">
            {members.map((member) => (
              <div 
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-secondary">
                      {member.profile?.username?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {member.profile?.status === 'online' && (
                    <div className="absolute -bottom-0.5 -right-0.5 presence-dot presence-online" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {member.profile?.username || 'Unknown'}
                    </span>
                    {getRoleBadge(member.role)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {member.profile?.status === 'online' ? 'Online' : 'Offline'}
                  </p>
                </div>
                {getRoleIcon(member.role)}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}