-- ステータス遷移の制限を撤廃（自由に変更可能にする）

-- 既存のトリガー関数を簡素化
CREATE OR REPLACE FUNCTION validate_project_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- ステータスが変更された場合のタイムスタンプを自動設定
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    CASE NEW.status
      WHEN 'executing'::project_status_enum THEN
        -- 実行中になった時のタイムスタンプ設定
        IF NEW.started_at IS NULL THEN
          NEW.started_at = NOW();
        END IF;
        IF NEW.matched_at IS NULL THEN
          NEW.matched_at = NOW();
        END IF;
        
      WHEN 'completed'::project_status_enum THEN
        -- 完了時のタイムスタンプ設定
        IF NEW.completed_at IS NULL THEN
          NEW.completed_at = NOW();
        END IF;
        
      WHEN 'cancelled'::project_status_enum THEN
        -- キャンセル時のタイムスタンプ設定
        IF NEW.cancelled_at IS NULL THEN
          NEW.cancelled_at = NOW();
        END IF;
      
      ELSE
        -- その他のステータスでは何もしない
        NULL;
    END CASE;
    
    -- 権限チェック：プロジェクトのオーナーのみステータス変更可能
    IF auth.uid() != NEW.client_id AND 
       NOT EXISTS (
         SELECT 1 FROM profiles 
         WHERE id = auth.uid() 
         AND user_type = 'admin'
       ) THEN
      RAISE EXCEPTION 'Only project owner can change status';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- コメント更新
COMMENT ON FUNCTION validate_project_status_transition() IS 'ステータス変更時のタイムスタンプ自動設定（遷移制限なし）';