/*
# Fix DM creation: create_dm RPC

The direct-messaging "Message" button did nothing because creating a
conversation from the client was blocked by Row Level Security:

1. The `conversations` table had only a SELECT policy and NO INSERT policy,
   so `insert into conversations` silently returned null.
2. The `conversation_members` INSERT policy only allows inserting a row
   where `user_id = auth.uid()`, so the client could add its OWN membership
   but NOT the other participant's membership row. A 1:1 DM needs both rows.

The result: `getOrCreateConversation` threw "failed to create conversation",
the promise rejected silently, and navigation never happened.

## Fix

Add a `create_dm(p_other uuid)` SECURITY DEFINER function that does the
whole operation atomically on the server, using `auth.uid()` as the caller:
  - If a conversation already exists between the caller and p_other, returns it.
  - Otherwise inserts a new `conversations` row and both `conversation_members`
    rows (caller + p_other), then returns the new conversation id.

Because the function is SECURITY DEFINER, it runs with the table owner's
privileges and bypasses RLS — but it is safe because it always anchors the
caller via `auth.uid()` (the JWT-authenticated user) and refuses to operate
when unauthenticated or when the caller tries to DM themselves.

## Security
  - SECURITY DEFINER, search_path pinned to public (injection-safe).
  - Revoke from anon; grant execute to authenticated only.
  - Uses auth.uid() so a caller can only create DMs where THEY are a member.

## Notes
  - No tables or columns changed; no data loss.
  - Idempotent (CREATE OR REPLACE; ON CONFLICT DO NOTHING on members).
  - Frontend `getOrCreateConversation` is updated to call this RPC.
*/

CREATE OR REPLACE FUNCTION create_dm(p_other uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv uuid;
  v_existing uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF p_other IS NULL THEN
    RAISE EXCEPTION 'missing recipient';
  END IF;
  IF p_other = auth.uid() THEN
    RAISE EXCEPTION 'cannot start a conversation with yourself';
  END IF;

  -- Return an existing 1:1 conversation shared by the caller and p_other
  SELECT cm1.conversation_id INTO v_existing
  FROM conversation_members cm1
  JOIN conversation_members cm2
    ON cm2.conversation_id = cm1.conversation_id
  WHERE cm1.user_id = auth.uid()
    AND cm2.user_id = p_other
  LIMIT 1;
  IF v_existing IS NOT NULL THEN
    RETURN v_existing;
  END IF;

  -- Create a new conversation + both memberships atomically
  INSERT INTO conversations (id) VALUES (gen_random_uuid())
  RETURNING id INTO v_conv;

  INSERT INTO conversation_members (conversation_id, user_id) VALUES
    (v_conv, auth.uid()),
    (v_conv, p_other)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  RETURN v_conv;
END;
$$;

REVOKE EXECUTE ON FUNCTION create_dm(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION create_dm(uuid) TO authenticated;
