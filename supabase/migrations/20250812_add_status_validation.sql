-- ステータス遷移の検証とセキュリティ強化

-- 1. ステータス遷移を検証する関数
CREATE OR REPLACE FUNCTION validate_project_status_transition()
RETURNS TRIGGER AS $$
BEGIN
  -- ステータスが変更された場合のみ検証
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- 遷移可能性をチェック
    CASE OLD.status
      WHEN 'draft'::project_status_enum THEN
        IF NEW.status NOT IN ('published'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from draft to %', NEW.status;
        END IF;
        
      WHEN 'published'::project_status_enum THEN
        IF NEW.status NOT IN ('reviewing'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from published to %', NEW.status;
        END IF;
        
      WHEN 'reviewing'::project_status_enum THEN
        IF NEW.status NOT IN ('contracted'::project_status_enum, 'published'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from reviewing to %', NEW.status;
        END IF;
        
      WHEN 'contracted'::project_status_enum THEN
        IF NEW.status NOT IN ('in_progress'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from contracted to %', NEW.status;
        END IF;
        -- contracted → in_progress の場合、selected_pro_id が必須
        IF NEW.status = 'in_progress'::project_status_enum AND NEW.selected_pro_id IS NULL THEN
          RAISE EXCEPTION 'Cannot start project without selecting a professional';
        END IF;
        
      WHEN 'in_progress'::project_status_enum THEN
        IF NEW.status NOT IN ('in_review'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from in_progress to %', NEW.status;
        END IF;
        
      WHEN 'in_review'::project_status_enum THEN
        IF NEW.status NOT IN ('completed'::project_status_enum, 'in_progress'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from in_review to %', NEW.status;
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
      WHEN 'in_progress'::project_status_enum THEN
        IF NEW.started_at IS NULL THEN
          NEW.started_at = NOW();
        END IF;
        
      WHEN 'completed'::project_status_enum THEN
        IF NEW.completed_at IS NULL THEN
          NEW.completed_at = NOW();
        END IF;
        
      WHEN 'cancelled'::project_status_enum THEN
        IF NEW.cancelled_at IS NULL THEN
          NEW.cancelled_at = NOW();
        END IF;
        
      WHEN 'contracted'::project_status_enum THEN
        IF NEW.matched_at IS NULL THEN
          NEW.matched_at = NOW();
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

-- 2. トリガーの作成
DROP TRIGGER IF EXISTS validate_project_status_transition_trigger ON projects;
CREATE TRIGGER validate_project_status_transition_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION validate_project_status_transition();

-- 3. データ整合性の制約を追加
ALTER TABLE projects 
ADD CONSTRAINT check_status_timestamps CHECK (
  (status != 'in_progress'::project_status_enum OR started_at IS NOT NULL) AND
  (status != 'completed'::project_status_enum OR completed_at IS NOT NULL) AND
  (status != 'cancelled'::project_status_enum OR cancelled_at IS NOT NULL)
);

-- 4. 進捗率の自動更新
CREATE OR REPLACE FUNCTION update_project_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- ステータスに基づいて進捗率を自動設定
  CASE NEW.status
    WHEN 'draft'::project_status_enum THEN
      NEW.progress_percentage = 0;
    WHEN 'published'::project_status_enum THEN
      NEW.progress_percentage = 10;
    WHEN 'reviewing'::project_status_enum THEN
      NEW.progress_percentage = 20;
    WHEN 'contracted'::project_status_enum THEN
      NEW.progress_percentage = 30;
    WHEN 'in_progress'::project_status_enum THEN
      -- in_progressの場合は手動設定を許可（30-90の範囲）
      IF NEW.progress_percentage IS NULL OR NEW.progress_percentage < 30 THEN
        NEW.progress_percentage = 50;
      END IF;
    WHEN 'in_review'::project_status_enum THEN
      IF NEW.progress_percentage < 90 THEN
        NEW.progress_percentage = 90;
      END IF;
    WHEN 'completed'::project_status_enum THEN
      NEW.progress_percentage = 100;
    WHEN 'cancelled'::project_status_enum THEN
      -- キャンセル時は進捗率を維持
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. 進捗率更新トリガー
DROP TRIGGER IF EXISTS update_project_progress_trigger ON projects;
CREATE TRIGGER update_project_progress_trigger
  BEFORE INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_project_progress();

-- 6. RLSポリシーの更新（ステータス変更権限を明確化）
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
CREATE POLICY "Users can update own projects" ON projects
  FOR UPDATE USING (
    auth.uid() = client_id
  )
  WITH CHECK (
    auth.uid() = client_id
  );

-- 7. インデックスの追加（パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_projects_status_client ON projects(status, client_id);
CREATE INDEX IF NOT EXISTS idx_projects_selected_pro ON projects(selected_pro_id) WHERE selected_pro_id IS NOT NULL;

COMMENT ON FUNCTION validate_project_status_transition() IS 'プロジェクトステータスの遷移を検証し、不正な変更を防ぐ';
COMMENT ON FUNCTION update_project_progress() IS 'ステータスに応じて進捗率を自動更新';