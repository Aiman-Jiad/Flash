/*
# Reels realtime publication

Adds the `reels` table to the Supabase realtime publication so the reels screen
can receive live UPDATE events (like_count, comment_count) without polling.
`posts` is already published (migration 0002); this adds the reels counterpart.
*/
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE reels; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
