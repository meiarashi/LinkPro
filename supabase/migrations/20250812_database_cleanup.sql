-- データベースクリーンアップ
-- 未使用テーブルの削除と整理

-- ============================================
-- 1. 未使用テーブルの削除
-- ============================================

-- ai_skills テーブル（未使用 - profile_details.ai_skillsに統合済み）
DROP TABLE IF EXISTS ai_skills CASCADE;

-- saved_searches テーブル（未実装機能）
DROP TABLE IF EXISTS saved_searches CASCADE;

-- project_completions テーブル（将来的な機能のため一旦削除）
-- 注意: このテーブルは20250812_fix_dependencies_and_add_project_status.sqlで作成されたばかりなので、
-- 本当に削除する場合は、関連するポリシーやビューも削除する必要があります
DROP POLICY IF EXISTS "View project completions" ON project_completions;
DROP POLICY IF EXISTS "Create project completions" ON project_completions;
DROP VIEW IF EXISTS pro_completion_stats;
DROP TABLE IF EXISTS project_completions CASCADE;

-- ============================================
-- 2. project_templates テーブルの確認
-- ============================================
-- project_templates は初期データのみで実際には使われていない可能性があるが、
-- 将来的にテンプレート機能を実装する可能性があるため、現時点では保持

-- テーブルにコメントを追加して用途を明確化
COMMENT ON TABLE project_templates IS '【将来実装予定】AIプロジェクトテンプレート - 現在は初期データのみ';

-- ============================================
-- 3. 既存テーブルの最適化
-- ============================================

-- 不要なインデックスの確認と削除
-- 重複しているインデックスがあれば削除
DROP INDEX IF EXISTS idx_projects_client_id; -- idx_projects_status_clientに統合されているため不要

-- ============================================
-- 4. データ整合性の確認
-- ============================================

-- 孤立したメッセージ（会話が削除されているが残っているメッセージ）を削除
DELETE FROM messages 
WHERE conversation_id IS NOT NULL 
  AND conversation_id NOT IN (SELECT id FROM conversations);

-- 孤立した通知（関連するエンティティが削除されている通知）を削除
DELETE FROM notifications 
WHERE related_type = 'project' 
  AND related_id::uuid NOT IN (SELECT id FROM projects);

DELETE FROM notifications 
WHERE related_type = 'application' 
  AND related_id::uuid NOT IN (SELECT id FROM applications);

-- ============================================
-- 5. ビューの整理
-- ============================================

-- project_status_summary ビューの再作成（最新のステータスに対応）
DROP VIEW IF EXISTS project_status_summary;
CREATE VIEW project_status_summary AS
SELECT 
  p.client_id,
  p.status,
  COUNT(*) as count,
  COUNT(CASE WHEN p.created_at > NOW() - INTERVAL '7 days' THEN 1 END) as count_this_week,
  COUNT(CASE WHEN p.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as count_this_month
FROM projects p
WHERE p.status != 'cancelled'
GROUP BY p.client_id, p.status;

-- ============================================
-- 6. 権限の整理
-- ============================================

-- ビューへの権限を再設定
GRANT SELECT ON project_status_summary TO authenticated;

-- ============================================
-- 7. 統計情報の更新
-- ============================================

-- 統計情報を更新してクエリパフォーマンスを最適化
ANALYZE profiles;
ANALYZE projects;
ANALYZE applications;
ANALYZE messages;
ANALYZE conversations;
ANALYZE notifications;
ANALYZE matching_scores;
ANALYZE ai_conversations;

-- ============================================
-- 完了メッセージ
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'データベースクリーンアップが完了しました';
  RAISE NOTICE '削除されたテーブル: ai_skills, saved_searches, project_completions';
  RAISE NOTICE '保持されたテーブル: project_templates（将来実装用）';
END $$;