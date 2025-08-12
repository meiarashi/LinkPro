-- progress_percentage（進捗率）を完全に削除するマイグレーション

-- ========================================
-- 1. トリガーの削除と再作成（進捗率関連を除去）
-- ========================================

-- 既存のトリガーを削除
DROP TRIGGER IF EXISTS update_project_progress_trigger ON projects;
DROP FUNCTION IF EXISTS update_project_progress() CASCADE;

-- ステータス遷移検証関数を再作成（進捗率チェックを削除）
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
        IF NEW.status NOT IN ('draft'::project_status_enum, 'contracted'::project_status_enum, 'cancelled'::project_status_enum) THEN
          RAISE EXCEPTION 'Invalid status transition from recruiting to %', NEW.status;
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

-- ========================================
-- 2. 制約の削除
-- ========================================

-- 進捗率に関する制約を削除
ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_progress_percentage_check;

-- ========================================
-- 3. カラムの削除
-- ========================================

-- progress_percentageカラムを削除
ALTER TABLE projects DROP COLUMN IF EXISTS progress_percentage CASCADE;

-- 関連する可能性のある他のカラムも削除（存在する場合）
ALTER TABLE projects DROP COLUMN IF EXISTS estimated_end_date CASCADE;
ALTER TABLE projects DROP COLUMN IF EXISTS actual_end_date CASCADE;

-- ========================================
-- 4. コメントの更新
-- ========================================

COMMENT ON FUNCTION validate_project_status_transition() IS 'プロジェクトステータスの遷移を検証し、不正な変更を防ぐ';
COMMENT ON TABLE projects IS 'プロジェクト管理テーブル（進捗率機能は削除済み）';

-- ========================================
-- 5. インデックスの最適化（必要に応じて）
-- ========================================

-- 既存のインデックスを確認し、必要なものだけを維持
REINDEX TABLE projects;