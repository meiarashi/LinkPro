-- Drop all existing message triggers
DROP TRIGGER IF EXISTS trigger_new_message ON messages;

-- Create a simplified debug version that logs information
CREATE OR REPLACE FUNCTION notify_new_message_simple()
RETURNS TRIGGER AS $$
DECLARE
  v_receiver_id UUID;
  v_application applications%ROWTYPE;
  v_project projects%ROWTYPE;
  v_sender_name TEXT;
BEGIN
  -- Log the trigger execution
  RAISE NOTICE 'Message trigger fired for message ID: %, sender: %, application: %', 
    NEW.id, NEW.sender_id, NEW.application_id;
  
  -- Get application details
  SELECT * INTO v_application FROM applications WHERE id = NEW.application_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No application found for ID: %', NEW.application_id;
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'Application found: PM=%, Project=%', v_application.pm_id, v_application.project_id;
  
  -- Get project details
  SELECT * INTO v_project FROM projects WHERE id = v_application.project_id;
  
  IF NOT FOUND THEN
    RAISE NOTICE 'No project found for ID: %', v_application.project_id;
    RETURN NEW;
  END IF;
  
  RAISE NOTICE 'Project found: Client=%', v_project.client_id;
  
  -- Get sender name
  SELECT full_name INTO v_sender_name FROM profiles WHERE id = NEW.sender_id;
  
  -- Determine receiver
  IF NEW.sender_id = v_application.pm_id THEN
    -- PM is sending, notify client
    v_receiver_id := v_project.client_id;
    RAISE NOTICE 'PM is sender, notifying client: %', v_receiver_id;
  ELSE
    -- Client is sending, notify PM
    v_receiver_id := v_application.pm_id;
    RAISE NOTICE 'Client is sender, notifying PM: %', v_receiver_id;
  END IF;
  
  -- Check if receiver_id is valid
  IF v_receiver_id IS NULL THEN
    RAISE NOTICE 'Receiver ID is NULL, cannot create notification';
    RETURN NEW;
  END IF;
  
  -- Try to create notification
  BEGIN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      related_id,
      related_type
    ) VALUES (
      v_receiver_id,
      'new_message',
      'New Message',
      COALESCE(v_sender_name, 'Someone') || ' sent you a message',
      NEW.id,
      'message'
    );
    
    RAISE NOTICE 'Notification created successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to create notification: %', SQLERRM;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
CREATE TRIGGER trigger_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message_simple();

-- Also create a test function to verify the data relationships
CREATE OR REPLACE FUNCTION test_message_notification_data(p_application_id UUID)
RETURNS TABLE (
  application_exists BOOLEAN,
  pm_id UUID,
  project_exists BOOLEAN,
  client_id UUID,
  project_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    EXISTS(SELECT 1 FROM applications WHERE id = p_application_id),
    a.pm_id,
    EXISTS(SELECT 1 FROM projects WHERE id = a.project_id),
    p.client_id,
    a.project_id
  FROM applications a
  LEFT JOIN projects p ON p.id = a.project_id
  WHERE a.id = p_application_id;
END;
$$ LANGUAGE plpgsql;