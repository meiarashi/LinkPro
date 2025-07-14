-- 既存のmatching_scoresテーブルを更新してMVP用に調整
-- 注意：ai_talent_profilesとproject_matching_candidatesビューが依存しているため、一時的に削除する必要がある

-- 1. 依存しているビューを削除（依存関係の順序に注意）
DROP VIEW IF EXISTS ai_talent_profiles CASCADE;
DROP VIEW IF EXISTS project_matching_candidates CASCADE;

-- 2. 既存のテーブルに新しいカラムを追加（存在しない場合のみ）
ALTER TABLE public.matching_scores 
ADD COLUMN IF NOT EXISTS experience_score NUMERIC(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS availability_score NUMERIC(4,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS match_percentage INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_notified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pro_id UUID;

-- 3. スコアカラムの精度を更新（NUMERIC(3,2)からNUMERIC(4,2)へ）
ALTER TABLE public.matching_scores 
ALTER COLUMN level_match_score TYPE NUMERIC(4,2),
ALTER COLUMN tool_match_score TYPE NUMERIC(4,2),
ALTER COLUMN domain_match_score TYPE NUMERIC(4,2);

-- 4. total_scoreの精度を更新（100点満点に対応）
ALTER TABLE public.matching_scores 
ALTER COLUMN total_score TYPE NUMERIC(5,2);

-- 5. 既存のai_talent_idの値をpro_idにコピー
UPDATE public.matching_scores 
SET pro_id = ai_talent_id 
WHERE pro_id IS NULL;

-- 6. ai_talent_profilesビューを再作成
CREATE OR REPLACE VIEW ai_talent_profiles AS
SELECT 
    p.id,
    p.full_name,
    p.avatar_url,
    (p.profile_details ->> 'ai_level'::text) AS ai_level,
    (p.profile_details -> 'ai_tools'::text) AS ai_tools,
    (p.profile_details -> 'ai_experience'::text) AS ai_experience,
    p.rate_info,
    p.availability,
    (0)::bigint AS use_case_count,
    count(DISTINCT s.id) AS skill_count,
    avg(ms.total_score) AS avg_match_score
FROM profiles p
LEFT JOIN ai_skills s ON p.id = s.user_id
LEFT JOIN matching_scores ms ON p.id = ms.ai_talent_id
WHERE p.user_type = 'pro' AND p.deleted_at IS NULL
GROUP BY p.id, p.full_name, p.avatar_url, p.profile_details, p.rate_info, p.availability;

-- 7. project_matching_candidatesビューを再作成
CREATE OR REPLACE VIEW project_matching_candidates AS
SELECT 
    pr.id AS project_id,
    pr.title AS project_title,
    pr.client_id,
    ms.ai_talent_id,
    p.full_name AS talent_name,
    ms.total_score,
    ms.level_match_score,
    ms.tool_match_score,
    ms.domain_match_score,
    ms.recommendation_reason,
    ms.calculated_at
FROM projects pr
JOIN matching_scores ms ON pr.id = ms.project_id
JOIN profiles p ON ms.ai_talent_id = p.id
WHERE pr.status = 'public' AND p.deleted_at IS NULL
ORDER BY ms.total_score DESC;

-- 8. インデックスを追加（存在しない場合のみ）
CREATE INDEX IF NOT EXISTS idx_matching_scores_pro_id ON public.matching_scores(pro_id);

-- 9. コメントを更新
COMMENT ON COLUMN public.matching_scores.level_match_score IS 'スキルレベル適合度（30点満点）';
COMMENT ON COLUMN public.matching_scores.tool_match_score IS 'AIツール一致度（25点満点）';
COMMENT ON COLUMN public.matching_scores.domain_match_score IS '業務領域・業界経験（20点満点）';
COMMENT ON COLUMN public.matching_scores.experience_score IS '経験年数・実績（15点満点）';
COMMENT ON COLUMN public.matching_scores.availability_score IS '稼働可能性（10点満点）';
COMMENT ON COLUMN public.matching_scores.total_score IS '合計スコア（100点満点）';
COMMENT ON COLUMN public.matching_scores.match_percentage IS 'パーセンテージ表示用（0-100）';
COMMENT ON COLUMN public.matching_scores.is_notified IS '通知済みフラグ';

-- 10. 既存のデータを新しいスコアリングシステムに変換（既存データがある場合）
-- 既存のスコア（0-1）を新しいスコア（各満点）に変換
UPDATE public.matching_scores 
SET 
  level_match_score = CASE 
    WHEN level_match_score <= 1 THEN level_match_score * 30 
    ELSE level_match_score 
  END,
  tool_match_score = CASE 
    WHEN tool_match_score <= 1 THEN tool_match_score * 25 
    ELSE tool_match_score 
  END,
  domain_match_score = CASE 
    WHEN domain_match_score <= 1 THEN domain_match_score * 20 
    ELSE domain_match_score 
  END,
  experience_score = COALESCE(experience_score, 10),
  availability_score = COALESCE(availability_score, 10)
WHERE total_score <= 1 OR total_score IS NULL;

-- 11. total_scoreとmatch_percentageを再計算
UPDATE public.matching_scores 
SET 
  total_score = COALESCE(level_match_score, 0) + COALESCE(tool_match_score, 0) + COALESCE(domain_match_score, 0) + COALESCE(experience_score, 0) + COALESCE(availability_score, 0),
  match_percentage = ROUND(COALESCE(level_match_score, 0) + COALESCE(tool_match_score, 0) + COALESCE(domain_match_score, 0) + COALESCE(experience_score, 0) + COALESCE(availability_score, 0));