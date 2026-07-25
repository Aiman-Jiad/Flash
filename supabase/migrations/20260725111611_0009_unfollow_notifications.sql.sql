/*
# Unfollow notifications + follows realtime

Brings the follows system to feature parity for the "connections" feature:

1. Modified Tables
   - `notifications` — the `type` CHECK constraint now also allows `'unfollow'`.
     (Existing rows and other types are untouched; the constraint is replaced
     idempotently to add the new value.)

2. Security
   - No RLS policy changes. The `notifications` INSERT policy already allows
     any authenticated actor to insert a row where `actor_id = auth.uid()`,
     which is exactly what we need to record an unfollow event.

3. Realtime
   - `follows` is added to `supabase_realtime` so the new connections lists
     can refresh live when someone follows/unfollows without polling.

4. Notes
   - No data loss: the constraint is dropped and recreated with the full
     allowed set (original values + 'unfollow'), preserving existing rows.
   - Idempotent: re-running drops the constraint before recreating.
*/

-- 1. Extend the notifications.type CHECK to include 'unfollow'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like','comment','follow','reel_like','comment_reply','story_reaction','message','unfollow'));

-- 2. Publish follows to realtime for live connections updates
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE follows; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
