/*
# Comment likes (post comments + reel comments)

1. New Tables
- `comment_likes` — likes on post comments (comments table).
  - id (uuid, pk), comment_id (uuid, fk -> comments.id cascade), user_id (uuid, fk -> profiles.id cascade), created_at
  - UNIQUE (comment_id, user_id) so a user can like a comment once.
- `comment_reel_likes` — likes on reel comments (comments_reels table).
  - id (uuid, pk), comment_id (uuid, fk -> comments_reels.id cascade), user_id (uuid, fk -> profiles.id cascade), created_at
  - UNIQUE (comment_id, user_id)

2. Modified Tables
- `comments` — add `like_count integer NOT NULL DEFAULT 0` (denormalized count).
- `comments_reels` — add `like_count integer NOT NULL DEFAULT 0` (denormalized count).

3. Security
- Enable RLS on both new tables.
- SELECT public (TO authenticated USING true) so anyone signed in can see likes.
- INSERT owner-only (auth.uid() = user_id).
- DELETE owner-only (auth.uid() = user_id).

4. Triggers
- `comments_like_count_trigger` — maintains comments.like_count on insert/delete of comment_likes.
- `comments_reels_like_count_trigger` — maintains comments_reels.like_count on insert/delete of comment_reel_likes.

5. Notes
- Idempotent: uses IF NOT EXISTS / DROP POLICY IF EXISTS.
- No data loss: only additive columns and new tables.
*/

-- ============ Add like_count to comments ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments' AND column_name='like_count') THEN
    ALTER TABLE comments ADD COLUMN like_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============ Add like_count to comments_reels ============
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='comments_reels' AND column_name='like_count') THEN
    ALTER TABLE comments_reels ADD COLUMN like_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============ COMMENT LIKES (post comments) ============
CREATE TABLE IF NOT EXISTS comment_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS comment_likes_comment_idx ON comment_likes (comment_id);
CREATE INDEX IF NOT EXISTS comment_likes_user_idx ON comment_likes (user_id);

DROP POLICY IF EXISTS "comment_likes_select" ON comment_likes;
CREATE POLICY "comment_likes_select" ON comment_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "comment_likes_insert_own" ON comment_likes;
CREATE POLICY "comment_likes_insert_own" ON comment_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comment_likes_delete_own" ON comment_likes;
CREATE POLICY "comment_likes_delete_own" ON comment_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ REEL COMMENT LIKES ============
CREATE TABLE IF NOT EXISTS comment_reel_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id uuid NOT NULL REFERENCES comments_reels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (comment_id, user_id)
);
ALTER TABLE comment_reel_likes ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS comment_reel_likes_comment_idx ON comment_reel_likes (comment_id);
CREATE INDEX IF NOT EXISTS comment_reel_likes_user_idx ON comment_reel_likes (user_id);

DROP POLICY IF EXISTS "comment_reel_likes_select" ON comment_reel_likes;
CREATE POLICY "comment_reel_likes_select" ON comment_reel_likes FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "comment_reel_likes_insert_own" ON comment_reel_likes;
CREATE POLICY "comment_reel_likes_insert_own" ON comment_reel_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "comment_reel_likes_delete_own" ON comment_reel_likes;
CREATE POLICY "comment_reel_likes_delete_own" ON comment_reel_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ Triggers: maintain like_count ============
CREATE OR REPLACE FUNCTION comments_like_count_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comments_like_count_ins ON comment_likes;
CREATE TRIGGER comments_like_count_ins AFTER INSERT ON comment_likes
FOR EACH ROW EXECUTE FUNCTION comments_like_count_trigger();
DROP TRIGGER IF EXISTS comments_like_count_del ON comment_likes;
CREATE TRIGGER comments_like_count_del AFTER DELETE ON comment_likes
FOR EACH ROW EXECUTE FUNCTION comments_like_count_trigger();

CREATE OR REPLACE FUNCTION comments_reels_like_count_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments_reels SET like_count = like_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments_reels SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.comment_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comments_reels_like_count_ins ON comment_reel_likes;
CREATE TRIGGER comments_reels_like_count_ins AFTER INSERT ON comment_reel_likes
FOR EACH ROW EXECUTE FUNCTION comments_reels_like_count_trigger();
DROP TRIGGER IF EXISTS comments_reels_like_count_del ON comment_reel_likes;
CREATE TRIGGER comments_reels_like_count_del AFTER DELETE ON comment_reel_likes
FOR EACH ROW EXECUTE FUNCTION comments_reels_like_count_trigger();
