/*
# Flash — Instagram clone core schema (fix: create conversations before members)

Creates conversations table before conversation_members (FK dependency).
*/

-- ============ PROFILES ============
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  full_name text,
  bio text,
  avatar_url text,
  website text,
  is_private boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============ POSTS ============
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  caption text,
  location text,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts (user_id);
DROP POLICY IF EXISTS "posts_select" ON posts;
CREATE POLICY "posts_select" ON posts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_update_own" ON posts;
CREATE POLICY "posts_update_own" ON posts FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "posts_delete_own" ON posts;
CREATE POLICY "posts_delete_own" ON posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ POST IMAGES ============
CREATE TABLE IF NOT EXISTS post_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  url text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE post_images ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS post_images_post_id_idx ON post_images (post_id);
DROP POLICY IF EXISTS "post_images_select" ON post_images;
CREATE POLICY "post_images_select" ON post_images FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "post_images_insert_own" ON post_images;
CREATE POLICY "post_images_insert_own" ON post_images FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.user_id = auth.uid())
);
DROP POLICY IF EXISTS "post_images_delete_own" ON post_images;
CREATE POLICY "post_images_delete_own" ON post_images FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM posts WHERE posts.id = post_images.post_id AND posts.user_id = auth.uid())
);

-- ============ COMMENTS ============
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES comments(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments (post_id, created_at);
CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments (parent_id);
DROP POLICY IF EXISTS "comments_select" ON comments;
CREATE POLICY "comments_select" ON comments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "comments_insert_own" ON comments;
CREATE POLICY "comments_insert_own" ON comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comments_delete_own" ON comments;
CREATE POLICY "comments_delete_own" ON comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ LIKES ============
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS likes_post_id_idx ON likes (post_id);
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON likes (user_id);
DROP POLICY IF EXISTS "likes_select" ON likes;
CREATE POLICY "likes_select" ON likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "likes_insert_own" ON likes;
CREATE POLICY "likes_insert_own" ON likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "likes_delete_own" ON likes;
CREATE POLICY "likes_delete_own" ON likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ SAVES ============
CREATE TABLE IF NOT EXISTS saves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id)
);
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS saves_user_id_idx ON saves (user_id);
DROP POLICY IF EXISTS "saves_select_own" ON saves;
CREATE POLICY "saves_select_own" ON saves FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "saves_insert_own" ON saves;
CREATE POLICY "saves_insert_own" ON saves FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "saves_delete_own" ON saves;
CREATE POLICY "saves_delete_own" ON saves FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ FOLLOWS ============
CREATE TABLE IF NOT EXISTS follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  followee_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followee_id),
  CHECK (follower_id <> followee_id)
);
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS follows_followee_idx ON follows (followee_id);
CREATE INDEX IF NOT EXISTS follows_follower_idx ON follows (follower_id);
DROP POLICY IF EXISTS "follows_select" ON follows;
CREATE POLICY "follows_select" ON follows FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "follows_insert_own" ON follows;
CREATE POLICY "follows_insert_own" ON follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
DROP POLICY IF EXISTS "follows_delete_own" ON follows;
CREATE POLICY "follows_delete_own" ON follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- ============ STORIES ============
CREATE TABLE IF NOT EXISTS stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS stories_user_created_idx ON stories (user_id, created_at DESC);
DROP POLICY IF EXISTS "stories_select" ON stories;
CREATE POLICY "stories_select" ON stories FOR SELECT TO authenticated USING (expires_at > now());
DROP POLICY IF EXISTS "stories_insert_own" ON stories;
CREATE POLICY "stories_insert_own" ON stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "stories_delete_own" ON stories;
CREATE POLICY "stories_delete_own" ON stories FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ STORY VIEWS ============
CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (story_id, user_id)
);
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "story_views_select_own" ON story_views;
CREATE POLICY "story_views_select_own" ON story_views FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM stories WHERE stories.id = story_views.story_id AND stories.user_id = auth.uid())
);
DROP POLICY IF EXISTS "story_views_insert_own" ON story_views;
CREATE POLICY "story_views_insert_own" ON story_views FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ STORY REACTIONS ============
CREATE TABLE IF NOT EXISTS story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "story_reactions_select_own" ON story_reactions;
CREATE POLICY "story_reactions_select_own" ON story_reactions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM stories WHERE stories.id = story_reactions.story_id AND stories.user_id = auth.uid())
);
DROP POLICY IF EXISTS "story_reactions_insert_own" ON story_reactions;
CREATE POLICY "story_reactions_insert_own" ON story_reactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ REELS ============
CREATE TABLE IF NOT EXISTS reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  url text NOT NULL,
  caption text,
  audio_name text,
  like_count integer NOT NULL DEFAULT 0,
  comment_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE reels ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS reels_created_at_idx ON reels (created_at DESC);
DROP POLICY IF EXISTS "reels_select" ON reels;
CREATE POLICY "reels_select" ON reels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reels_insert_own" ON reels;
CREATE POLICY "reels_insert_own" ON reels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reels_delete_own" ON reels;
CREATE POLICY "reels_delete_own" ON reels FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REEL LIKES ============
CREATE TABLE IF NOT EXISTS reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (reel_id, user_id)
);
ALTER TABLE reel_likes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "reel_likes_select" ON reel_likes;
CREATE POLICY "reel_likes_select" ON reel_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "reel_likes_insert_own" ON reel_likes;
CREATE POLICY "reel_likes_insert_own" ON reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "reel_likes_delete_own" ON reel_likes;
CREATE POLICY "reel_likes_delete_own" ON reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REEL COMMENTS ============
CREATE TABLE IF NOT EXISTS comments_reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reel_id uuid NOT NULL REFERENCES reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE comments_reels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "comments_reels_select" ON comments_reels;
CREATE POLICY "comments_reels_select" ON comments_reels FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "comments_reels_insert_own" ON comments_reels;
CREATE POLICY "comments_reels_insert_own" ON comments_reels FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comments_reels_delete_own" ON comments_reels;
CREATE POLICY "comments_reels_delete_own" ON comments_reels FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ CONVERSATIONS (created BEFORE members) ============
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ============ CONVERSATION MEMBERS ============
CREATE TABLE IF NOT EXISTS conversation_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (conversation_id, user_id)
);
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "conv_members_select" ON conversation_members;
CREATE POLICY "conv_members_select" ON conversation_members FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM conversation_members cm WHERE cm.conversation_id = conversation_members.conversation_id AND cm.user_id = auth.uid())
);
DROP POLICY IF EXISTS "conv_members_insert_own" ON conversation_members;
CREATE POLICY "conv_members_insert_own" ON conversation_members FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "conversations_select_member" ON conversations;
CREATE POLICY "conversations_select_member" ON conversations FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM conversation_members WHERE conversation_members.conversation_id = conversations.id AND conversation_members.user_id = auth.uid())
);

-- ============ MESSAGES ============
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  seen boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS messages_conversation_idx ON messages (conversation_id, created_at);
DROP POLICY IF EXISTS "messages_select_member" ON messages;
CREATE POLICY "messages_select_member" ON messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM conversation_members WHERE conversation_members.conversation_id = messages.conversation_id AND conversation_members.user_id = auth.uid())
);
DROP POLICY IF EXISTS "messages_insert_own" ON messages;
CREATE POLICY "messages_insert_own" ON messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (SELECT 1 FROM conversation_members WHERE conversation_members.conversation_id = messages.conversation_id AND conversation_members.user_id = auth.uid())
);
DROP POLICY IF EXISTS "messages_update_seen" ON messages;
CREATE POLICY "messages_update_seen" ON messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM conversation_members WHERE conversation_members.conversation_id = messages.conversation_id AND conversation_members.user_id = auth.uid())
) WITH CHECK (true);

-- ============ NOTIFICATIONS ============
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  actor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('like','comment','follow','reel_like','comment_reply','story_reaction','message')),
  entity_id uuid,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);
DROP POLICY IF EXISTS "notifications_select_own" ON notifications;
CREATE POLICY "notifications_select_own" ON notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_insert" ON notifications;
CREATE POLICY "notifications_insert" ON notifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = actor_id);
DROP POLICY IF EXISTS "notifications_update_own" ON notifications;
CREATE POLICY "notifications_update_own" ON notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications_delete_own" ON notifications;
CREATE POLICY "notifications_delete_own" ON notifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ HASHTAGS ============
CREATE TABLE IF NOT EXISTS hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hashtags_select" ON hashtags;
CREATE POLICY "hashtags_select" ON hashtags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "hashtags_insert" ON hashtags;
CREATE POLICY "hashtags_insert" ON hashtags FOR INSERT TO authenticated WITH CHECK (true);

-- ============ POST HASHTAGS ============
CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "post_hashtags_select" ON post_hashtags;
CREATE POLICY "post_hashtags_select" ON post_hashtags FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "post_hashtags_insert_own" ON post_hashtags;
CREATE POLICY "post_hashtags_insert_own" ON post_hashtags FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM posts WHERE posts.id = post_hashtags.post_id AND posts.user_id = auth.uid())
);

-- ============ updated_at trigger for profiles ============
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============ Storage buckets ============
INSERT INTO storage.buckets (id, name, public) VALUES
  ('avatars', 'avatars', true),
  ('posts', 'posts', true),
  ('stories', 'stories', true),
  ('reels', 'reels', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_public_read" ON storage.objects;
CREATE POLICY "avatars_public_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars');
DROP POLICY IF EXISTS "avatars_owner_write" ON storage.objects;
CREATE POLICY "avatars_owner_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND auth.uid() = owner);
DROP POLICY IF EXISTS "avatars_owner_update" ON storage.objects;
CREATE POLICY "avatars_owner_update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND auth.uid() = owner);
DROP POLICY IF EXISTS "posts_public_read" ON storage.objects;
CREATE POLICY "posts_public_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'posts');
DROP POLICY IF EXISTS "posts_owner_write" ON storage.objects;
CREATE POLICY "posts_owner_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'posts' AND auth.uid() = owner);
DROP POLICY IF EXISTS "posts_owner_delete" ON storage.objects;
CREATE POLICY "posts_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'posts' AND auth.uid() = owner);
DROP POLICY IF EXISTS "stories_public_read" ON storage.objects;
CREATE POLICY "stories_public_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'stories');
DROP POLICY IF EXISTS "stories_owner_write" ON storage.objects;
CREATE POLICY "stories_owner_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'stories' AND auth.uid() = owner);
DROP POLICY IF EXISTS "stories_owner_delete" ON storage.objects;
CREATE POLICY "stories_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'stories' AND auth.uid() = owner);
DROP POLICY IF EXISTS "reels_public_read" ON storage.objects;
CREATE POLICY "reels_public_read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'reels');
DROP POLICY IF EXISTS "reels_owner_write" ON storage.objects;
CREATE POLICY "reels_owner_write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'reels' AND auth.uid() = owner);
DROP POLICY IF EXISTS "reels_owner_delete" ON storage.objects;
CREATE POLICY "reels_owner_delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'reels' AND auth.uid() = owner);
