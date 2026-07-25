/*
# Flash — message notifications trigger

When a DM is inserted, create a 'message' notification for the recipient so
they see "X sent you a message" in their Activity feed (in real time, since
`notifications` is already in the supabase_realtime publication).

Without this, recipients had no idea they'd been messaged — the row landed in
`messages` but nothing pointed the recipient to it.

## Design
  - SECURITY DEFINER + pinned search_path: the trigger runs as the table
    owner, so it bypasses RLS on `notifications` safely. This is necessary
    because a regular trigger would run as the sender (auth.uid = sender),
    and while that happens to satisfy the `auth.uid() = actor_id` insert
    policy, making it DEFINER removes that fragility.
  - Anchored to the row: recipient is derived from `conversation_members`
    (the member who is NOT the sender). No user input is trusted.
  - One notification per message. `entity_id` stores the conversation_id so
    the notification can deep-link straight into the chat.
  - `left(NEW.body, 120)` keeps the preview short and avoids overflow.
*/

CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recipient uuid;
BEGIN
  IF NEW.sender_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT user_id INTO v_recipient
  FROM conversation_members
  WHERE conversation_id = NEW.conversation_id
    AND user_id <> NEW.sender_id
  LIMIT 1;

  IF v_recipient IS NOT NULL THEN
    INSERT INTO notifications (user_id, actor_id, type, entity_id, body)
    VALUES (v_recipient, NEW.sender_id, 'message', NEW.conversation_id, left(NEW.body, 120));
  END IF;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS messages_notify_recipient ON messages;
CREATE TRIGGER messages_notify_recipient
AFTER INSERT ON messages
FOR EACH ROW EXECUTE FUNCTION notify_new_message();
