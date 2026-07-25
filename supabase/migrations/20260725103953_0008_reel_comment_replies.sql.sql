/*
# Reel comment replies + delete

Brings reel comments to feature parity with post comments:
1. Adds `parent_id` to `comments_reels` so a reel comment can reply to another
   reel comment (same pattern as the `comments` table for posts).
2. Adds an UPDATE RLS policy so the author of a reel comment can edit it if
   needed later (post comments have no UPDATE policy, but reel comments get
   one for forward-compat). DELETE is already owner-only.
3. Adds an index on parent_id for reply lookups (matches comments table).
4. Re-publishes `comments_reels` to realtime so the reel comment modal can
   receive live INSERT events when new comments/replies arrive.

No data loss: only an additive nullable column, a new index, and idempotent
policy/publication statements.
*/

-- 1. parent_id column (nullable, self-referencing, cascade on delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comments_reels' AND column_name = 'parent_id'
  ) THEN
    ALTER TABLE comments_reels ADD COLUMN parent_id uuid REFERENCES comments_reels(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2. Index for reply lookups
CREATE INDEX IF NOT EXISTS comments_reels_parent_id_idx ON comments_reels (parent_id);

-- 3. UPDATE policy (owner-only) — additive, idempotent
DROP POLICY IF EXISTS "comments_reels_update_own" ON comments_reels;
CREATE POLICY "comments_reels_update_own" ON comments_reels FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Realtime: publish comments_reels for live comment/reply updates
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE comments_reels; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
