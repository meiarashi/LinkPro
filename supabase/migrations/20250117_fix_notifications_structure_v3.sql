-- 通知テーブルの構造を修正（v3: 関数の重複を考慮）

-- 1. updated_atカラムを追加（存在しない場合）
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW());

-- 2. metadataカラムを追加（JSONBとして、将来の拡張性のため）
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. 重複したINSERTポリシーを削除
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON notifications;

-- 4. より良いインデックスを追加（ユーザーIDと作成日時の複合インデックス）
CREATE INDEX IF NOT EXISTS idx_notifications_user_created 
ON notifications(user_id, created_at DESC);

-- 5. 既存のcreate_notification関数を確認して削除
DO $$
BEGIN
  -- 既存の関数を削除（引数リストを指定）
  DROP FUNCTION IF EXISTS create_notification(UUID, VARCHAR, VARCHAR, TEXT, UUID, VARCHAR, JSONB);
  DROP FUNCTION IF EXISTS create_notification(UUID, VARCHAR, VARCHAR, TEXT, UUID, VARCHAR);
  DROP FUNCTION IF EXISTS create_notification(UUID, VARCHAR, VARCHAR, TEXT);
END $$;

-- 6. notify_new_message_fixed関数を修正（存在する場合のみ）
CREATE OR REPLACE FUNCTION notify_new_message_fixed()
RETURNS TRIGGER AS $$
DECLARE
  v_sender_name TEXT;
  v_project_title TEXT;
  v_notification_title TEXT;
  v_notification_message TEXT;
BEGIN
  -- 送信者の名前を取得
  SELECT full_name INTO v_sender_name
  FROM profiles
  WHERE id = NEW.sender_id;
  
  -- プロジェクトタイトルを取得
  SELECT p.title INTO v_project_title
  FROM conversations c
  JOIN projects p ON c.project_id = p.id
  WHERE c.id = NEW.conversation_id;
  
  -- 通知のタイトルとメッセージを設定
  v_notification_title := COALESCE(v_sender_name, '送信者') || ' から新しいメッセージ';
  v_notification_message := COALESCE(
    'プロジェクト「' || v_project_title || '」で' || COALESCE(v_sender_name, '送信者') || 'さんからメッセージが届きました: ' || 
    CASE 
      WHEN LENGTH(NEW.content) > 50 THEN SUBSTRING(NEW.content FROM 1 FOR 50) || '...'
      ELSE NEW.content
    END,
    '新しいメッセージが届きました'
  );
  
  -- 通知を作成（metadataカラムを使用）
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    related_type,
    metadata
  )
  VALUES (
    NEW.receiver_id,
    'message_received',
    v_notification_title,
    v_notification_message,
    NEW.conversation_id,
    'conversation',
    jsonb_build_object(
      'message_id', NEW.id,
      'sender_id', NEW.sender_id,
      'conversation_id', NEW.conversation_id
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. 既存のデータを新しい形式に移行（必要に応じて）
UPDATE notifications 
SET type = 'application_received' 
WHERE type = 'new_application';

UPDATE notifications 
SET type = 'message_received' 
WHERE type = 'new_message';

UPDATE notifications 
SET type = 'project_matched' 
WHERE type = 'ai_match';

-- 8. related_typeの制約を緩く設定（既存データを考慮）
DO $$
DECLARE
  v_existing_related_types TEXT[];
BEGIN
  -- 既存のrelated_typeを取得
  SELECT ARRAY_AGG(DISTINCT related_type) INTO v_existing_related_types
  FROM notifications
  WHERE related_type IS NOT NULL;
  
  -- より緩い制約を追加（NULLも許可）
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'notifications_related_type_check'
  ) THEN
    ALTER TABLE notifications 
    ADD CONSTRAINT notifications_related_type_check 
    CHECK (
      related_type IN ('project', 'application', 'message', 'conversation', 'user') 
      OR related_type IS NULL
    );
  END IF;
END $$;

-- 9. データ移行後、改めて型制約を追加する試み
DO $$
BEGIN
  -- すべてのデータが移行されたか確認
  IF NOT EXISTS (
    SELECT 1 FROM notifications 
    WHERE type NOT IN (
      'application_received',
      'application_accepted', 
      'application_rejected',
      'message_received',
      'project_matched'
    )
  ) THEN
    -- 制約が存在しない場合のみ追加
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conname = 'notifications_type_check'
    ) THEN
      ALTER TABLE notifications 
      ADD CONSTRAINT notifications_type_check 
      CHECK (type IN (
        'application_received',
        'application_accepted', 
        'application_rejected',
        'message_received',
        'project_matched'
      ));
      RAISE NOTICE 'Type constraint added successfully';
    END IF;
  ELSE
    RAISE NOTICE 'Some notifications have unexpected types. Skipping type constraint.';
  END IF;
END $$;

-- 10. 改良版のcreate_notification関数（名前を変更）
CREATE OR REPLACE FUNCTION create_notification_v2(
  p_user_id UUID,
  p_type VARCHAR,
  p_title VARCHAR,
  p_message TEXT,
  p_related_id UUID DEFAULT NULL,
  p_related_type VARCHAR DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_id,
    related_type,
    metadata
  )
  VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_related_id,
    p_related_type,
    p_metadata
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. 権限を付与
GRANT EXECUTE ON FUNCTION create_notification_v2 TO authenticated;

-- 確認用クエリ（コメントアウト）
-- SELECT type, COUNT(*) FROM notifications GROUP BY type ORDER BY type;
-- SELECT * FROM pg_policies WHERE tablename = 'notifications';
-- SELECT * FROM pg_constraint WHERE conrelid = 'notifications'::regclass;
-- SELECT * FROM pg_indexes WHERE tablename = 'notifications';