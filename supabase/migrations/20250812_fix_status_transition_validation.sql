-- ステータス遷移検証を5段階システムに完全対応させる修正

-- 既存のトリガー関数を置き換え
CREATE OR REPLACE FUNCTION validate_project_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- ステータスが変更された場合のみ検証
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- 遷移可能性をチェック
    CASE OLD.status
      WHEN 'draft'::project_status_enum THEN
        IF NEW.status NOT IN ('recruiting'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from draft to %', NEW.status;
        END IF;
        
      WHEN 'recruiting'::project_status_enum THEN
        -- 募集中からは下書き、実行中、キャンセルへ遷移可能
        -- Pro人材の選定要件は削除（シンプルな5段階フローのため）
        IF NEW.status NOT IN ('draft'::project_status_enum, 'executing'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from recruiting to %', NEW.status;
        END IF;
        
      WHEN 'executing'::project_status_enum THEN
        -- 実行中からは完了、キャンセルへ遷移可能
        IF NEW.status NOT IN ('completed'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from executing to %', NEW.status;
        END IF;
        
      WHEN 'completed'::project_status_enum THEN
        -- 完了済みからは変更不可
        RAISE EXCEPTION 'Cannot change status from completed';
        
      WHEN 'cancelled'::project_status_enum THEN
        -- キャンセル済みからは変更不可
        RAISE EXCEPTION 'Cannot change status from cancelled';
        
      ELSE
        -- 未知のステータス
        RAISE EXCEPTION 'Unknown status: %', OLD.status;
    END CASE;
    
    -- ステータス変更時に関連するタイムスタンプを自動設定
    CASE NEW.status
      WHEN 'executing'::project_status_enum THEN
        IF NEW.started_at IS NULL THEN
          NEW.started_at = NOW();
        END IF;
        -- matched_atも設定（Pro人材が決定したタイミング）
        IF NEW.matched_at IS NULL THEN
          NEW.matched_at = NOW();
        END IF;
        
      WHEN 'completed'::project_status_enum THEN
        IF NEW.completed_at IS NULL THEN
          NEW.completed_at = NOW();
        END IF;
        
      WHEN 'cancelled'::project_status_enum THEN
        IF NEW.cancelled_at IS NULL THEN
          NEW.cancelled_at = NOW();
        END IF;
    END CASE;
  END IF;
  
  -- 権限チェック：プロジェクトのオーナーのみステータス変更可能
  IF OLD.status IS DISTINCT FROM NEW.status THEN
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
COMMENT ON FUNCTION validate_project_status_transition() IS '5段階ステータスシステムの遷移検証（Pro人材選定要件なし）';