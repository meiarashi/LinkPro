-- プロジェクトステータス管理の拡張（依存関係を考慮した修正版）
-- カンバンビューとプロジェクト実績追跡のための改善

-- 1. まず依存しているオブジェクトを一時的に削除または無効化

-- トリガーを一時的に削除（後で再作成）
DROP TRIGGER IF EXISTS on_project_publish_calculate_matching ON projects;

-- RLSポリシーを一時的に削除（後で再作成）
DROP POLICY IF EXISTS public_projects_are_viewable_by_all ON projects;

-- 2. 新しいステータス型を作成（既に存在する場合はスキップ）
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'project_status_enum') THEN
        CREATE TYPE project_status_enum AS ENUM (
          'draft',        -- 下書き
          'published',    -- 公開中（応募受付中）
          'reviewing',    -- 応募者選定中
          'contracted',   -- 契約済み（開始前）
          'in_progress',  -- 進行中
          'in_review',    -- 完了確認中
          'completed',    -- 完了
          'cancelled'     -- キャンセル
        );
    END IF;
END$$;

-- 3. 新しいstatusカラムを追加（既存のstatusカラムは一旦残す）
ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS new_status project_status_enum DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS matched_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  ADD COLUMN IF NOT EXISTS estimated_end_date DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date DATE,
  ADD COLUMN IF NOT EXISTS completion_confirmed_by_client BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS completion_confirmed_by_pro BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS selected_pro_id UUID REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS contract_amount DECIMAL(10, 2),
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- 4. 既存データを新しいカラムに移行
UPDATE projects
SET new_status = CASE 
  WHEN status = 'draft' THEN 'draft'::project_status_enum
  WHEN status = 'public' THEN 'published'::project_status_enum
  WHEN status = 'private' THEN 'published'::project_status_enum
  WHEN status = 'completed' THEN 'completed'::project_status_enum
  WHEN status = 'cancelled' THEN 'cancelled'::project_status_enum
  ELSE 'draft'::project_status_enum
END;

-- 5. 古いstatusカラムを削除
ALTER TABLE projects DROP COLUMN IF EXISTS status;

-- 6. new_statusカラムをstatusにリネーム
ALTER TABLE projects RENAME COLUMN new_status TO status;

-- 7. RLSポリシーを再作成（新しいステータスに対応）
CREATE POLICY public_projects_are_viewable_by_all ON projects
  FOR SELECT USING (
    status IN ('published'::project_status_enum, 'reviewing'::project_status_enum) 
    OR auth.uid() = client_id
  );

-- 8. トリガー関数を更新（新しいステータスに対応）
CREATE OR REPLACE FUNCTION trigger_matching_calculation()
RETURNS TRIGGER AS $$
BEGIN
  -- プロジェクトが公開された時（published）にマッチング計算を実行
  IF NEW.status = 'published'::project_status_enum AND 
     (OLD.status IS NULL OR OLD.status != 'published'::project_status_enum) THEN
    
    -- calculate_matching_scores_for_project関数を呼び出す
    PERFORM calculate_matching_scores_for_project(NEW.id);
    
    -- マッチングスコアが高いプロ人材に通知
    INSERT INTO notifications (user_id, type, title, message, related_id, related_type)
    SELECT 
      ms.ai_talent_id,
      'new_matching_project',
      '新しいマッチングプロジェクト',
      'あなたのスキルにマッチする新しいプロジェクト「' || NEW.title || '」が公開されました',
      NEW.id,
      'project'
    FROM matching_scores ms
    WHERE ms.project_id = NEW.id
      AND ms.total_score >= 35  -- スコア35点以上のプロ人材に通知
    ORDER BY ms.total_score DESC
    LIMIT 5;  -- 上位5名まで
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. トリガーを再作成
CREATE TRIGGER on_project_publish_calculate_matching
  AFTER INSERT OR UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_matching_calculation();

-- 10. プロジェクト実績テーブル（将来的な拡張用）
CREATE TABLE IF NOT EXISTS project_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pro_id UUID NOT NULL REFERENCES profiles(id),
  client_id UUID NOT NULL REFERENCES profiles(id),
  completion_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  duration_days INTEGER,
  client_rating INTEGER CHECK (client_rating >= 1 AND client_rating <= 5),
  pro_rating INTEGER CHECK (pro_rating >= 1 AND pro_rating <= 5),
  client_review TEXT,
  pro_review TEXT,
  is_public BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, pro_id)
);

-- 11. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_selected_pro ON projects(selected_pro_id);
CREATE INDEX IF NOT EXISTS idx_projects_completed_at ON projects(completed_at);
CREATE INDEX IF NOT EXISTS idx_project_completions_pro ON project_completions(pro_id);
CREATE INDEX IF NOT EXISTS idx_project_completions_client ON project_completions(client_id);

-- 12. RLSポリシーの追加
ALTER TABLE project_completions ENABLE ROW LEVEL SECURITY;

-- 完了実績の閲覧（公開されているもの、または自分が関係するもの）
CREATE POLICY "View project completions" ON project_completions
  FOR SELECT USING (
    is_public = TRUE 
    OR auth.uid() = pro_id 
    OR auth.uid() = client_id
  );

-- 完了実績の作成（プロジェクトのクライアントのみ）
CREATE POLICY "Create project completions" ON project_completions
  FOR INSERT WITH CHECK (
    auth.uid() = client_id
  );

-- 13. ビューの作成（ダッシュボード用の集計）
CREATE OR REPLACE VIEW project_status_summary AS
SELECT 
  p.client_id,
  p.status,
  COUNT(*) as count,
  COUNT(CASE WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as count_this_week
FROM projects p
WHERE p.status != 'cancelled'::project_status_enum
GROUP BY p.client_id, p.status;

-- Pro側の実績サマリービュー
CREATE OR REPLACE VIEW pro_completion_stats AS
SELECT 
  pc.pro_id,
  COUNT(*) as total_completed,
  AVG(pc.client_rating)::NUMERIC(3,2) as avg_rating,
  COUNT(CASE WHEN pc.completion_date > NOW() - INTERVAL '30 days' THEN 1 END) as completed_last_30_days
FROM project_completions pc
WHERE pc.is_public = TRUE
GROUP BY pc.pro_id;

-- 権限設定
GRANT SELECT ON project_status_summary TO authenticated;
GRANT SELECT ON pro_completion_stats TO authenticated;

-- コメント追加
COMMENT ON COLUMN projects.status IS 'プロジェクトの現在のステータス';
COMMENT ON COLUMN projects.selected_pro_id IS '選定されたPro人材のID';
COMMENT ON COLUMN projects.progress_percentage IS '進捗率（0-100%）';
COMMENT ON TABLE project_completions IS 'プロジェクト完了実績と相互評価';