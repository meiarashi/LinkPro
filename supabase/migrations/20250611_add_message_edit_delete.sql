-- メッセージの編集・削除機能のためのカラム追加

-- 編集履歴を保存するカラムを追加
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS edit_history jsonb DEFAULT '[]'::jsonb;

-- 削除フラグと削除日時を追加（論理削除）
ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at timestamp with time zone;

-- 削除したユーザーを記録
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_by uuid;

-- メッセージ編集の権限ポリシー
CREATE POLICY "Users can update their own messages" ON messages
  FOR UPDATE 
  USING (auth.uid() = sender_id AND is_deleted = false)
  WITH CHECK (auth.uid() = sender_id);

-- メッセージ削除の権限ポリシー（実際には is_deleted を true にするだけ）
CREATE POLICY "Users can soft delete their own messages" ON messages
  FOR UPDATE 
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- 編集履歴に自動的に追加するトリガー関数
CREATE OR REPLACE FUNCTION add_edit_history()
RETURNS TRIGGER AS $$
BEGIN
  -- contentが変更された場合のみ編集履歴に追加
  IF OLD.content IS DISTINCT FROM NEW.content THEN
    NEW.edited_at = NOW();
    NEW.edit_history = NEW.edit_history || jsonb_build_object(
      'content', OLD.content,
      'edited_at', NOW(),
      'edited_by', auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを作成
CREATE TRIGGER on_message_edit
  BEFORE UPDATE OF content ON messages
  FOR EACH ROW
  EXECUTE FUNCTION add_edit_history();

-- 削除されたメッセージを非表示にするビューを作成（オプション）
CREATE OR REPLACE VIEW active_messages AS
SELECT * FROM messages WHERE is_deleted = false;