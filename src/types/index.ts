export interface Profile {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  website: string | null
  is_private: boolean
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  caption: string | null
  location: string | null
  like_count: number
  comment_count: number
  created_at: string
  profile?: Profile
  images?: PostImage[]
  liked_by_me?: boolean
  saved_by_me?: boolean
}

export interface PostImage {
  id: string
  post_id: string
  url: string
  position: number
  created_at: string
}

export interface Comment {
  id: string
  post_id: string
  user_id: string
  parent_id: string | null
  body: string
  created_at: string
  profile?: Profile
  replies?: Comment[]
}

export interface Like {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface Save {
  id: string
  post_id: string
  user_id: string
  created_at: string
}

export interface Follow {
  id: string
  follower_id: string
  followee_id: string
  created_at: string
}

export interface Story {
  id: string
  user_id: string
  url: string
  caption: string | null
  expires_at: string
  created_at: string
  profile?: Profile
  viewed_by_me?: boolean
  views?: number
}

export interface StoryReaction {
  id: string
  story_id: string
  user_id: string
  emoji: string
  created_at: string
}

export interface Reel {
  id: string
  user_id: string
  url: string
  caption: string | null
  audio_name: string | null
  like_count: number
  comment_count: number
  created_at: string
  profile?: Profile
  liked_by_me?: boolean
}

export interface Conversation {
  id: string
  created_at: string
  otherUser?: Profile
  lastMessage?: Message
  unread?: number
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  body: string
  seen: boolean
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  actor_id: string
  type: 'like' | 'comment' | 'follow' | 'reel_like' | 'comment_reply' | 'story_reaction' | 'message'
  entity_id: string | null
  body: string | null
  read: boolean
  created_at: string
  actor?: Profile
}
