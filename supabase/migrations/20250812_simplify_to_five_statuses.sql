-- ステータスを5段階に簡素化するマイグレーション
-- contracted（契約済み）とin_review（確認中）を削除
-- in_progress（進行中）をexecuting（実行中）にリネーム

-- ========================================
-- 1. 新しいENUM型の作成
-- ========================================

CREATE TYPE project_status_enum_simplified AS ENUM (
  'draft',        -- 下書き
  'recruiting',   -- 募集中
  'executing',    -- 実行中（旧: in_progress）
  'completed',    -- 完了
  'cancelled'     -- キャンセル
);

-- ========================================
-- 2. 既存の制約とトリガーを一時的に削除
-- ========================================

DROP TRIGGER IF EXISTS validate_project_status_transition_trigger ON projects;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_status_timestamps;

-- 依存オブジェクトを一時的に削除
DROP POLICY IF EXISTS public_projects_are_viewable_by_all ON projects;
DROP VIEW IF EXISTS project_status_summary CASCADE;

-- ========================================
-- 3. 新しいstatusカラムを追加してデータ移行
-- ========================================

ALTER TABLE projects ADD COLUMN status_simplified project_status_enum_simplified;

-- 既存データを新しいステータスにマッピング
UPDATE projects
SET status_simplified = CASE 
  WHEN status = 'draft'::project_status_enum THEN 'draft'::project_status_enum_simplified
  WHEN status = 'recruiting'::project_status_enum THEN 'recruiting'::project_status_enum_simplified
  WHEN status IN ('contracted'::project_status_enum, 'in_progress'::project_status_enum, 'in_review'::project_status_enum) 
    THEN 'executing'::project_status_enum_simplified
  WHEN status = 'completed'::project_status_enum THEN 'completed'::project_status_enum_simplified
  WHEN status = 'cancelled'::project_status_enum THEN 'cancelled'::project_status_enum_simplified
END;

-- ========================================
-- 4. カラムの入れ替え
-- ========================================

ALTER TABLE projects DROP COLUMN status CASCADE;
ALTER TABLE projects RENAME COLUMN status_simplified TO status;
ALTER TABLE projects ALTER COLUMN status SET NOT NULL;
ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'draft'::project_status_enum_simplified;

-- 古いENUM型を削除し、新しいENUM型をリネーム
DROP TYPE project_status_enum CASCADE;
ALTER TYPE project_status_enum_simplified RENAME TO project_status_enum;

-- ========================================
-- 5. ステータス遷移検証関数を再作成（簡素化版）
-- ========================================

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

-- ========================================
-- 6. トリガーの再作成
-- ========================================

-- 既存のトリガーを削除してから再作成
DROP TRIGGER IF EXISTS validate_project_status_transition_trigger ON projects;

CREATE TRIGGER validate_project_status_transition_trigger
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION validate_project_status_transition();

-- ========================================
-- 7. 制約の再作成
-- ========================================

ALTER TABLE projects 
ADD CONSTRAINT check_status_timestamps CHECK (
  (status != 'executing'::project_status_enum OR started_at IS NOT NULL) AND
  (status != 'completed'::project_status_enum OR completed_at IS NOT NULL) AND
  (status != 'cancelled'::project_status_enum OR cancelled_at IS NOT NULL)
);

-- ========================================
-- 8. ポリシーとビューの再作成
-- ========================================

-- 募集中プロジェクトを公開
CREATE POLICY public_projects_are_viewable_by_all ON projects
  FOR SELECT
  USING (status = 'recruiting'::project_status_enum);

-- ステータスサマリービュー
CREATE OR REPLACE VIEW project_status_summary AS
SELECT 
  status,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as count_last_week,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as count_last_month
FROM projects
GROUP BY status;

-- ========================================
-- 9. インデックスの最適化
-- ========================================

CREATE INDEX IF NOT EXISTS idx_projects_status_client ON projects(status, client_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status) WHERE status IN ('recruiting', 'executing');

-- ========================================
-- 10. コメント追加
-- ========================================

COMMENT ON COLUMN projects.status IS '簡素化された5段階のプロジェクトステータス';
COMMENT ON FUNCTION validate_project_status_transition() IS '簡素化されたステータス遷移検証（5段階）';