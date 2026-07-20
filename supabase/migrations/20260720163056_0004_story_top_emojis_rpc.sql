/*
# Top story emojis RPC + story message support

1. New Functions
- `top_story_emojis(p_limit int default 5)` — returns the most-used emojis across
  all story reactions, ordered by frequency descending. Runs as SECURITY DEFINER
  so the anon-key frontend can read aggregated reaction counts (the
  `story_reactions` table is owner-scoped for SELECT). Returns one row per
  emoji with `emoji` and `count` columns. Used by the story viewer to show
  the 5 most popular reactions.

2. Security
- Function is SECURITY DEFINER, owned by postgres, and read-only (SELECT
  with GROUP BY). It exposes only aggregate counts, not individual reactions
  or viewer identities.

3. Notes
- No schema changes to existing tables.
- The existing `getOrCreateConversation` + `sendMessage` client functions
  already support DM-ing the story author; this migration only adds the
  aggregation helper for the emoji bar.
*/

CREATE OR REPLACE FUNCTION top_story_emojis(p_limit int DEFAULT 5)
RETURNS TABLE (emoji text, count bigint) AS $$
  SELECT emoji, COUNT(*) AS count
  FROM story_reactions
  GROUP BY emoji
  ORDER BY count DESC
  LIMIT p_limit;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
