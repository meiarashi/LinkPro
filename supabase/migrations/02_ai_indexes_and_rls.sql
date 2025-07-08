-- ステップ2: インデックスとRLSポリシーの設定

-- =====================================================
-- インデックスの作成
-- =====================================================

-- ai_skillsテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_ai_skills_user_id ON public.ai_skills(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_skills_skill_level ON public.ai_skills(skill_level);
CREATE INDEX IF NOT EXISTS idx_ai_skills_category ON public.ai_skills(category);
CREATE INDEX IF NOT EXISTS idx_ai_skills_skill_name ON public.ai_skills(skill_name);

-- matching_scoresテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_matching_scores_project_id ON public.matching_scores(project_id);
CREATE INDEX IF NOT EXISTS idx_matching_scores_ai_talent_id ON public.matching_scores(ai_talent_id);
CREATE INDEX IF NOT EXISTS idx_matching_scores_total_score ON public.matching_scores(total_score DESC);
CREATE INDEX IF NOT EXISTS idx_matching_scores_calculated_at ON public.matching_scores(calculated_at DESC);

-- ai_use_casesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_ai_use_cases_user_id ON public.ai_use_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_use_cases_is_public ON public.ai_use_cases(is_public);
CREATE INDEX IF NOT EXISTS idx_ai_use_cases_tools_used ON public.ai_use_cases USING GIN(tools_used);
CREATE INDEX IF NOT EXISTS idx_ai_use_cases_tags ON public.ai_use_cases USING GIN(tags);

-- project_templatesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_project_templates_skill_level ON public.project_templates(skill_level);
CREATE INDEX IF NOT EXISTS idx_project_templates_category ON public.project_templates(category);
CREATE INDEX IF NOT EXISTS idx_project_templates_is_active ON public.project_templates(is_active);

-- =====================================================
-- RLS（Row Level Security）ポリシーの設定
-- =====================================================

-- ai_skillsテーブルのRLS
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_skills_select_policy" ON public.ai_skills
  FOR SELECT USING (true);

CREATE POLICY "ai_skills_insert_policy" ON public.ai_skills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_skills_update_policy" ON public.ai_skills
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ai_skills_delete_policy" ON public.ai_skills
  FOR DELETE USING (auth.uid() = user_id);

-- matching_scoresテーブルのRLS
ALTER TABLE public.matching_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matching_scores_select_policy" ON public.matching_scores
  FOR SELECT USING (
    auth.uid() = ai_talent_id OR
    auth.uid() IN (SELECT client_id FROM public.projects WHERE id = project_id)
  );

CREATE POLICY "matching_scores_insert_policy" ON public.matching_scores
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "matching_scores_update_policy" ON public.matching_scores
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ai_use_casesテーブルのRLS
ALTER TABLE public.ai_use_cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_use_cases_select_policy" ON public.ai_use_cases
  FOR SELECT USING (
    is_public = true OR auth.uid() = user_id
  );

CREATE POLICY "ai_use_cases_insert_policy" ON public.ai_use_cases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ai_use_cases_update_policy" ON public.ai_use_cases
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "ai_use_cases_delete_policy" ON public.ai_use_cases
  FOR DELETE USING (auth.uid() = user_id);

-- project_templatesテーブルのRLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "project_templates_select_policy" ON public.project_templates
  FOR SELECT USING (is_active = true);