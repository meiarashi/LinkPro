-- Trigger for new application notifications
CREATE OR REPLACE FUNCTION notify_new_application()
RETURNS TRIGGER AS $$
DECLARE
  v_project_title TEXT;
  v_applicant_name TEXT;
BEGIN
  -- Get project title
  SELECT title INTO v_project_title
  FROM projects
  WHERE id = NEW.project_id;
  
  -- Get applicant name
  SELECT full_name INTO v_applicant_name
  FROM profiles
  WHERE id = NEW.pm_id;
  
  -- Create notification for project owner
  PERFORM create_notification(
    (SELECT client_id FROM projects WHERE id = NEW.project_id),
    'new_application',
    'New Application',
    COALESCE(v_applicant_name, 'Anonymous PM') || ' applied to "' || v_project_title || '"',
    NEW.id,
    'application'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_new_application
AFTER INSERT ON applications
FOR EACH ROW
EXECUTE FUNCTION notify_new_application();

-- Trigger for application status update notifications
CREATE OR REPLACE FUNCTION notify_application_status_update()
RETURNS TRIGGER AS $$
DECLARE
  v_project_title TEXT;
  v_notification_type VARCHAR;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- Only notify if status actually changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get project title
  SELECT title INTO v_project_title
  FROM projects
  WHERE id = NEW.project_id;
  
  -- Set notification based on status
  IF NEW.status = 'accepted' THEN
    v_notification_type := 'application_accepted';
    v_notification_title := 'Application Accepted!';
    v_notification_message := 'Your application for "' || v_project_title || '" has been accepted.';
  ELSIF NEW.status = 'rejected' THEN
    v_notification_type := 'application_rejected';
    v_notification_title := 'Application Rejected';
    v_notification_message := 'Your application for "' || v_project_title || '" has been rejected.';
  ELSE
    RETURN NEW; -- Don't notify for other status changes
  END IF;
  
  -- Create notification for PM
  PERFORM create_notification(
    NEW.pm_id,
    v_notification_type,
    v_notification_title,
    v_notification_message,
    NEW.id,
    'application'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_application_status_update
AFTER UPDATE ON applications
FOR EACH ROW
EXECUTE FUNCTION notify_application_status_update();

-- Trigger for new message notifications
CREATE OR REPLACE FUNCTION notify_new_message()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_receiver_id UUID;
BEGIN
  -- Get sender name
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- Determine receiver
  IF NEW.sender_id = (SELECT pm_id FROM applications WHERE id = NEW.application_id) THEN
    SELECT client_id INTO v_receiver_id
    FROM projects p
    JOIN applications a ON a.project_id = p.id
    WHERE a.id = NEW.application_id;
  ELSE
    SELECT pm_id INTO v_receiver_id
    FROM applications
    WHERE id = NEW.application_id;
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_new_message
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION notify_new_message();