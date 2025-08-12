-- 完了から実行中への遷移を許可する修正

-- 既存のトリガー関数を更新
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
        IF NEW.status NOT IN ('draft'::project_status_enum, 'executing'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from recruiting to %', NEW.status;
        END IF;
        
      WHEN 'executing'::project_status_enum THEN
        -- 実行中からは完了、キャンセルへ遷移可能
        IF NEW.status NOT IN ('completed'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from executing to %', NEW.status;
        END IF;
        
      WHEN 'completed'::project_status_enum THEN
        -- 完了からは実行中に戻すことが可能（再開するケース）
        IF NEW.status NOT IN ('executing'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from completed to %', NEW.status;
        END IF;
        
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
        -- 完了から実行中に戻す場合は、タイムスタンプは更新しない（既存の値を保持）
        IF OLD.status = 'completed'::project_status_enum THEN
          -- 再開時の処理（必要に応じて再開日時を記録する場合はここに追加）
          NULL;
        ELSE
          -- 新規に実行中になる場合
          IF NEW.started_at IS NULL THEN
            NEW.started_at = NOW();
          END IF;
          IF NEW.matched_at IS NULL THEN
            NEW.matched_at = NOW();
          END IF;
        END IF;
        
      WHEN 'completed'::project_status_enum THEN
        IF NEW.completed_at IS NULL THEN
          NEW.completed_at = NOW();
        END IF;
        
      WHEN 'cancelled'::project_status_enum THEN
        IF NEW.cancelled_at IS NULL THEN
          NEW.cancelled_at = NOW();
        END IF;
      
      ELSE
        -- その他のステータスでは何もしない
        NULL;
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
COMMENT ON FUNCTION validate_project_status_transition() IS '5段階ステータスシステムの遷移検証（完了から実行中への戻りを許可）';