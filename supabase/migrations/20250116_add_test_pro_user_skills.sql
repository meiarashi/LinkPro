-- 2人目のプロユーザーにAIスキルを設定（同点処理テスト用）

-- 1. KAZUTOYO TANEMURAさんのプロフィールにAIスキル情報を追加
UPDATE profiles 
SET profile_details = jsonb_build_object(
  'ai_skills', '["developer"]'::jsonb,
  'ai_tools', '["ChatGPT", "Claude", "GitHub Copilot"]'::jsonb,
  'ai_experience', jsonb_build_object(
    'years', 2,
    'domains', '["営業支援", "マーケティング"]'::jsonb,
    'achievements', '["営業効率を40%改善", "AIチャットボット導入で問い合わせ対応時間を60%削減"]'::jsonb
  ),
  'ai_certifications', '[]'::jsonb,
  'industry_experience', '["IT", "製造"]'::jsonb
)
WHERE id = '7bcdb93e-f89a-43d4-8193-2f58f1175e7b' 
  AND user_type = 'pro';

-- 2. 3人目のテストプロユーザーを追加（異なるスコアでのテスト用）
-- 注：実際のシステムでは、ユーザーはauth.usersテーブル経由で作成する必要があります
-- ここではテスト用のサンプルクエリを提供

-- 3. 既存のマッチングスコアをクリア（再計算のため）
DELETE FROM matching_scores;

-- 4. 通知をクリア（重複を防ぐため）
DELETE FROM notifications WHERE type = 'new_matching_project';

-- 5. プロジェクトのステータスを更新してトリガーを再発火
-- すべての公開プロジェクトを一度draftに戻してから再公開
UPDATE projects 
SET status = 'draft'
WHERE status = 'public'
  AND pro_requirements IS NOT NULL
  AND pro_requirements != '{}'::jsonb;

-- 少し待ってから再公開
UPDATE projects 
SET status = 'public'
WHERE status = 'draft'
  AND pro_requirements IS NOT NULL
  AND pro_requirements != '{}'::jsonb;

-- 6. 結果を確認
SELECT 
  p.title as project_title,
  pr.full_name as pro_name,
  ms.level_match_score,
  ms.tool_match_score,
  ms.domain_match_score,
  ms.experience_score,
  ms.availability_score,
  ms.total_score,
  ms.match_percentage,
  ms.recommendation_reason
FROM matching_scores ms
JOIN projects p ON p.id = ms.project_id
JOIN profiles pr ON pr.id = ms.ai_talent_id
ORDER BY p.title, ms.total_score DESC;

-- 7. 通知の確認（同点処理の確認）
SELECT 
  n.title,
  n.message,
  pr.full_name as recipient_name,
  n.created_at
FROM notifications n
JOIN profiles pr ON pr.id = n.user_id
WHERE n.type = 'new_matching_project'
ORDER BY n.created_at DESC;

-- 8. スコアランキングの確認
WITH score_ranking AS (
  SELECT 
    project_id,
    ai_talent_id,
    total_score,
    DENSE_RANK() OVER (PARTITION BY project_id ORDER BY total_score DESC) as rank
  FROM matching_scores
)
SELECT 
  p.title as project_title,
  pr.full_name as pro_name,
  sr.total_score,
  sr.rank
FROM score_ranking sr
JOIN projects p ON p.id = sr.project_id
JOIN profiles pr ON pr.id = sr.ai_talent_id
WHERE sr.rank <= 5
ORDER BY p.title, sr.rank;