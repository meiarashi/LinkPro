-- ステップ3: トリガーと関数の作成

-- =====================================================
-- トリガーの作成
-- =====================================================

-- updated_atを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- ai_skillsテーブルのトリガー
CREATE TRIGGER update_ai_skills_updated_at 
  BEFORE UPDATE ON public.ai_skills 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ai_use_casesテーブルのトリガー
CREATE TRIGGER update_ai_use_cases_updated_at 
  BEFORE UPDATE ON public.ai_use_cases 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- project_templatesテーブルのトリガー
CREATE TRIGGER update_project_templates_updated_at 
  BEFORE UPDATE ON public.project_templates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- マッチングスコア計算関数
-- =====================================================

-- マッチングスコア計算関数（簡易版）
CREATE OR REPLACE FUNCTION calculate_matching_score(
  project_requirements JSONB,
  talent_profile JSONB
) RETURNS TABLE(
  level_match NUMERIC,
  tool_match NUMERIC,
  domain_match NUMERIC,
  total NUMERIC
) AS $$
DECLARE
  level_score NUMERIC := 0;
  tool_score NUMERIC := 0;
  domain_score NUMERIC := 0;
  total_score NUMERIC := 0;
  required_level TEXT;
  talent_level TEXT;
  required_tools TEXT[];
  talent_tools TEXT[];
  matching_tools INTEGER;
BEGIN
  -- レベルマッチング
  required_level := project_requirements->>'required_ai_level';
  talent_level := talent_profile->>'ai_level';
  
  IF required_level = talent_level THEN
    level_score := 1.0;
  ELSIF (required_level = 'user' AND talent_level IN ('developer', 'expert')) OR
        (required_level = 'developer' AND talent_level = 'expert') THEN
    level_score := 0.8;
  ELSIF (required_level = 'expert' AND talent_level = 'developer') OR
        (required_level = 'developer' AND talent_level = 'user') THEN
    level_score := 0.3;
  ELSE
    level_score := 0.1;
  END IF;
  
  -- ツールマッチング
  SELECT ARRAY(SELECT jsonb_array_elements_text(project_requirements->'required_ai_tools'))
  INTO required_tools;
  
  SELECT ARRAY(SELECT jsonb_array_elements_text(talent_profile->'ai_tools'))
  INTO talent_tools;
  
  IF array_length(required_tools, 1) > 0 THEN
    matching_tools := (
      SELECT COUNT(*) 
      FROM unnest(required_tools) rt 
      WHERE rt = ANY(talent_tools)
    );
    tool_score := matching_tools::NUMERIC / array_length(required_tools, 1);
  ELSE
    tool_score := 1.0;
  END IF;
  
  -- ドメインマッチング（簡易版：今は業界経験のみ）
  domain_score := 0.5; -- TODO: 実装を追加
  
  -- トータルスコア（重み付け）
  total_score := (level_score * 0.4 + tool_score * 0.4 + domain_score * 0.2);
  
  RETURN QUERY SELECT level_score, tool_score, domain_score, total_score;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ビューの作成
-- =====================================================

-- AI人材の総合プロフィールビュー
CREATE OR REPLACE VIEW public.ai_talent_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.avatar_url,
  p.profile_details->>'ai_level' as ai_level,
  p.profile_details->'ai_tools' as ai_tools,
  p.profile_details->'ai_experience' as ai_experience,
  p.rate_info,
  p.availability,
  COUNT(DISTINCT uc.id) as use_case_count,
  COUNT(DISTINCT s.id) as skill_count,
  AVG(ms.total_score) as avg_match_score
FROM public.profiles p
LEFT JOIN public.ai_use_cases uc ON p.id = uc.user_id AND uc.is_public = true
LEFT JOIN public.ai_skills s ON p.id = s.user_id
LEFT JOIN public.matching_scores ms ON p.id = ms.ai_talent_id
WHERE p.user_type = 'pro' AND p.deleted_at IS NULL
GROUP BY p.id, p.full_name, p.avatar_url, p.profile_details, p.rate_info, p.availability;

-- プロジェクトマッチング候補ビュー
CREATE OR REPLACE VIEW public.project_matching_candidates AS
SELECT 
  pr.id as project_id,
  pr.title as project_title,
  pr.client_id,
  ms.ai_talent_id,
  p.full_name as talent_name,
  ms.total_score,
  ms.level_match_score,
  ms.tool_match_score,
  ms.domain_match_score,
  ms.recommendation_reason,
  ms.calculated_at
FROM public.projects pr
JOIN public.matching_scores ms ON pr.id = ms.project_id
JOIN public.profiles p ON ms.ai_talent_id = p.id
WHERE pr.status = 'public' AND p.deleted_at IS NULL
ORDER BY ms.total_score DESC;

-- =====================================================
-- コメント追加
-- =====================================================

COMMENT ON TABLE public.ai_skills IS 'AI人材の詳細スキル情報';
COMMENT ON TABLE public.matching_scores IS 'プロジェクトとAI人材のマッチングスコア';
COMMENT ON TABLE public.ai_use_cases IS 'AI活用事例・ポートフォリオ';
COMMENT ON TABLE public.project_templates IS 'AI案件テンプレート';