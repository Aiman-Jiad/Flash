/*
# Story real-time enhancements

## What this does
Upgrades the stories system to support a fully real-time Instagram-like experience:
1. Adds a denormalized `view_count` column to the `stories` table so view counts are fast to read.
2. Adds a trigger that keeps `view_count` in sync whenever a row is inserted into `story_views`.
3. Adds `story_views` and `story_reactions` to the Supabase realtime publication so the story viewer
   updates live when someone views or reacts to a story while the owner is watching.
4. Re-publishes the `stories` table to ensure it is in the realtime publication (idempotent).

## New / modified columns
- `stories.view_count` (integer, NOT NULL, default 0) — denormalized count of unique viewers.

## Triggers
- `stories_view_count_inc` AFTER INSERT on `story_views` — increments `stories.view_count`.
  (No decrement on DELETE since story_views rows are rarely deleted and we want counts stable.)

## Realtime
- `story_views` added to `supabase_realtime` publication.
- `story_reactions` added to `supabase_realtime` publication.
- `stories` re-added (idempotent) to `supabase_realtime`.

## Security
- No new tables. No RLS policy changes. Existing policies remain in force.
- The trigger runs with `SECURITY DEFINER` privileges but only performs an UPDATE on the owning
  `stories` row — no cross-user data exposure.
*/

-- 1. Add view_count column (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stories' AND column_name = 'view_count'
  ) THEN
    ALTER TABLE stories ADD COLUMN view_count integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- 2. Trigger to increment view_count when a story is viewed
CREATE OR REPLACE FUNCTION increment_story_view_count()
RETURNS trigger AS $$
BEGIN
  UPDATE stories SET view_count = view_count + 1 WHERE id = NEW.story_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS stories_view_count_inc ON story_views;
CREATE TRIGGER stories_view_count_inc
AFTER INSERT ON story_views
FOR EACH ROW EXECUTE FUNCTION increment_story_view_count();

-- 3. Add story_views + story_reactions to realtime publication
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE story_views; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE story_reactions; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE stories; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
