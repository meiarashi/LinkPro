-- Debug: Create a simple test notification on every message
CREATE OR REPLACE FUNCTION notify_new_message_debug()
RETURNS TRIGGER AS $$
BEGIN
  -- Log for debugging
  RAISE NOTICE 'Message trigger fired: sender_id=%, application_id=%', NEW.sender_id, NEW.application_id;
  
  -- Create a simple notification directly
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    related_type
  ) VALUES (
    NEW.sender_id,  -- Just use sender for now
    'new_message',
    'Debug: Message Sent',
    'You sent a message (debug notification)',
    NEW.id,
    'message'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in notification trigger: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Replace existing trigger
DROP TRIGGER IF EXISTS trigger_new_message ON messages;
CREATE TRIGGER trigger_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message_debug();