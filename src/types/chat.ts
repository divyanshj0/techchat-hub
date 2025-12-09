export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  status: string;
  last_seen: string;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_by: string | null;
  created_at: string;
}

export interface ChannelMember {
  id: string;
  channel_id: string;
  user_id: string;
  role: 'admin' | 'moderator' | 'member';
  joined_at: string;
  profile?: Profile;
}

export interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  reply_count: number;
  created_at: string;
  updated_at: string;
  profile?: Profile;
}

export interface ChannelWithMembers extends Channel {
  members: ChannelMember[];
}