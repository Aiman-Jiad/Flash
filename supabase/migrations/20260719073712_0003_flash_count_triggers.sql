/*
# Flash — like/comment count maintenance triggers

Maintains denormalized like_count and comment_count on posts and reels
automatically, so the app doesn't need a custom RPC to increment/decrement.
*/

-- posts.like_count
CREATE OR REPLACE FUNCTION posts_like_count_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = like_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_like_count_ins ON likes;
CREATE TRIGGER posts_like_count_ins AFTER INSERT ON likes
FOR EACH ROW EXECUTE FUNCTION posts_like_count_trigger();
DROP TRIGGER IF EXISTS posts_like_count_del ON likes;
CREATE TRIGGER posts_like_count_del AFTER DELETE ON likes
FOR EACH ROW EXECUTE FUNCTION posts_like_count_trigger();

-- posts.comment_count
CREATE OR REPLACE FUNCTION posts_comment_count_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = comment_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_comment_count_ins ON comments;
CREATE TRIGGER posts_comment_count_ins AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION posts_comment_count_trigger();
DROP TRIGGER IF EXISTS posts_comment_count_del ON comments;
CREATE TRIGGER posts_comment_count_del AFTER DELETE ON comments
FOR EACH ROW EXECUTE FUNCTION posts_comment_count_trigger();

-- reels.like_count
CREATE OR REPLACE FUNCTION reels_like_count_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET like_count = like_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reels_like_count_ins ON reel_likes;
CREATE TRIGGER reels_like_count_ins AFTER INSERT ON reel_likes
FOR EACH ROW EXECUTE FUNCTION reels_like_count_trigger();
DROP TRIGGER IF EXISTS reels_like_count_del ON reel_likes;
CREATE TRIGGER reels_like_count_del AFTER DELETE ON reel_likes
FOR EACH ROW EXECUTE FUNCTION reels_like_count_trigger();

-- reels.comment_count
CREATE OR REPLACE FUNCTION reels_comment_count_trigger()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reels SET comment_count = comment_count + 1 WHERE id = NEW.reel_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reels SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.reel_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reels_comment_count_ins ON comments_reels;
CREATE TRIGGER reels_comment_count_ins AFTER INSERT ON comments_reels
FOR EACH ROW EXECUTE FUNCTION reels_comment_count_trigger();
DROP TRIGGER IF EXISTS reels_comment_count_del ON comments_reels;
CREATE TRIGGER reels_comment_count_del AFTER DELETE ON comments_reels
FOR EACH ROW EXECUTE FUNCTION reels_comment_count_trigger();
