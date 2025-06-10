-- Drop existing trigger first
DROP TRIGGER IF EXISTS trigger_new_message ON messages;

-- Fix the notify_new_message function
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_receiver_id UUID;
  v_application applications%ROWTYPE;
  v_project projects%ROWTYPE;
BEGIN
  -- Get application details
  SELECT * INTO v_application FROM applications WHERE id = NEW.application_id;
  IF NOT FOUND THEN
    RETURN NEW; -- No application found, skip notification
  END IF;
  
  -- Get project details
  SELECT * INTO v_project FROM projects WHERE id = v_application.project_id;
  IF NOT FOUND THEN
    RETURN NEW; -- No project found, skip notification
  END IF;
  
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Determine receiver based on sender
  IF NEW.sender_id = v_application.pm_id THEN
    -- PM is sending, notify client
    v_receiver_id := v_project.client_id;
  ELSE
    -- Client is sending, notify PM
    v_receiver_id := v_application.pm_id;
  END IF;
  
  -- Make sure receiver_id is not null
  IF v_receiver_id IS NULL THEN
    RETURN NEW; -- No receiver found, skip notification
  END IF;
  
  -- Create notification for receiver
  PERFORM create_notification(
    v_receiver_id,
    'new_message',
    'New Message',
    COALESCE(v_sender_name, 'Anonymous User') || ' sent you a message',
    NEW.id,
    'message'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the message insert
    RAISE WARNING 'Error creating notification: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER trigger_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();