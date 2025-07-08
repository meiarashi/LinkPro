-- AI人材マッチング機能のためのデータベース拡張
-- 作成日: 2025-01-08

-- =====================================================
-- 1. 既存テーブルへのAIフィールド追加
-- =====================================================

-- profiles.profile_detailsにAI関連情報を追加するための構造例
-- JSONBフィールドなので、アプリケーション側で以下の構造を保存する
-- {
--   "ai_level": "expert|developer|user|supporter",
--   "ai_tools": ["ChatGPT", "Claude", "GitHub Copilot", "Midjourney", etc],
--   "ai_experience": {
--     "years": 2,
--     "domains": ["営業支援", "コンテンツ生成", "業務効率化"],
--     "achievements": ["業務効率30%改善", "月間コスト50万円削減"]
--   },
--   "ai_certifications": ["AWS ML Specialty", "Google ML Engineer"],
--   "industry_experience": ["金融", "製造", "小売", "医療"]
-- }

-- projects.pm_requirementsにAI要件を追加するための構造例
-- JSONBフィールドなので、アプリケーション側で以下の構造を保存する
-- {
--   "required_ai_level": "developer",
--   "required_ai_tools": ["ChatGPT API", "Python", "LangChain"],
--   "expected_outcomes": ["自動化ツール開発", "チャットボット構築"],
--   "budget_range": {"min": 500000, "max": 1000000},
--   "project_category": "automation|analysis|content|support",
--   "industry": "金融",
--   "technical_requirements": {
--     "programming_languages": ["Python", "JavaScript"],
--     "frameworks": ["FastAPI", "Next.js"],
--     "cloud_platforms": ["AWS", "GCP"]
--   }
-- }

-- =====================================================
-- 2. 新規テーブルの作成
-- =====================================================

-- AI人材の詳細スキル管理テーブル
CREATE TABLE IF NOT EXISTS public.ai_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_level TEXT NOT NULL CHECK (skill_level IN ('expert', 'developer', 'user', 'supporter')),
  category TEXT NOT NULL CHECK (category IN ('technical', 'tool', 'business', 'industry')),
  skill_name TEXT NOT NULL,
  proficiency INTEGER CHECK (proficiency >= 1 AND proficiency <= 5),
  experience_months INTEGER CHECK (experience_months >= 0),
  use_cases TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, category, skill_name)
);

-- マッチングスコア保存テーブル
CREATE TABLE IF NOT EXISTS public.matching_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  ai_talent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  level_match_score NUMERIC(3,2) CHECK (level_match_score >= 0 AND level_match_score <= 1),
  tool_match_score NUMERIC(3,2) CHECK (tool_match_score >= 0 AND tool_match_score <= 1),
  domain_match_score NUMERIC(3,2) CHECK (domain_match_score >= 0 AND domain_match_score <= 1),
  total_score NUMERIC(3,2) CHECK (total_score >= 0 AND total_score <= 1),
  recommendation_reason TEXT,
  match_details JSONB DEFAULT '{}',
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(project_id, ai_talent_id)
);

-- AI活用事例テーブル
CREATE TABLE IF NOT EXISTS public.ai_use_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  tools_used TEXT[],
  business_impact TEXT,
  metrics JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  is_public BOOLEAN DEFAULT true,
  tags TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 案件テンプレートテーブル
CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_level TEXT NOT NULL CHECK (skill_level IN ('expert', 'developer', 'user', 'supporter')),
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  description_template TEXT,
  typical_requirements JSONB DEFAULT '{}',
  typical_duration TEXT,
  budget_range JSONB DEFAULT '{}',
  sample_deliverables TEXT[],
  required_skills TEXT[],
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- 3. インデックスの作成
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
-- 4. RLS（Row Level Security）ポリシーの設定
-- =====================================================

-- ai_skillsテーブルのRLS
ALTER TABLE public.ai_skills ENABLE ROW LEVEL SECURITY;

-- SELECT: 全員が閲覧可能
CREATE POLICY "ai_skills_select_policy" ON public.ai_skills
  FOR SELECT USING (true);

-- INSERT: 自分のスキルのみ作成可能
CREATE POLICY "ai_skills_insert_policy" ON public.ai_skills
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: 自分のスキルのみ更新可能
CREATE POLICY "ai_skills_update_policy" ON public.ai_skills
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: 自分のスキルのみ削除可能
CREATE POLICY "ai_skills_delete_policy" ON public.ai_skills
  FOR DELETE USING (auth.uid() = user_id);

-- matching_scoresテーブルのRLS
ALTER TABLE public.matching_scores ENABLE ROW LEVEL SECURITY;

-- SELECT: プロジェクトオーナーとAI人材本人のみ閲覧可能
CREATE POLICY "matching_scores_select_policy" ON public.matching_scores
  FOR SELECT USING (
    auth.uid() = ai_talent_id OR
    auth.uid() IN (SELECT client_id FROM public.projects WHERE id = project_id)
  );

-- INSERT/UPDATE: システムのみ（アプリケーションロジックで制御）
-- 一旦、認証済みユーザーなら誰でも作成可能にし、アプリケーション側で制御
CREATE POLICY "matching_scores_insert_policy" ON public.matching_scores
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "matching_scores_update_policy" ON public.matching_scores
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- ai_use_casesテーブルのRLS
ALTER TABLE public.ai_use_cases ENABLE ROW LEVEL SECURITY;

-- SELECT: 公開事例は全員、非公開は本人のみ
CREATE POLICY "ai_use_cases_select_policy" ON public.ai_use_cases
  FOR SELECT USING (
    is_public = true OR auth.uid() = user_id
  );

-- INSERT: 自分の事例のみ作成可能
CREATE POLICY "ai_use_cases_insert_policy" ON public.ai_use_cases
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- UPDATE: 自分の事例のみ更新可能
CREATE POLICY "ai_use_cases_update_policy" ON public.ai_use_cases
  FOR UPDATE USING (auth.uid() = user_id);

-- DELETE: 自分の事例のみ削除可能
CREATE POLICY "ai_use_cases_delete_policy" ON public.ai_use_cases
  FOR DELETE USING (auth.uid() = user_id);

-- project_templatesテーブルのRLS
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;

-- SELECT: 全員が閲覧可能（アクティブなものだけ）
CREATE POLICY "project_templates_select_policy" ON public.project_templates
  FOR SELECT USING (is_active = true);

-- INSERT/UPDATE/DELETE: 管理者のみ（今は実装しない）

-- =====================================================
-- 5. トリガーの作成
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
-- 6. 初期データの投入（案件テンプレート）
-- =====================================================

INSERT INTO public.project_templates (skill_level, category, title, description_template, typical_requirements, typical_duration, budget_range, sample_deliverables, required_skills) VALUES
-- エキスパート向けテンプレート
('expert', 'ml_development', '機械学習モデル開発', 
 'ビジネス課題を解決するための機械学習モデルの開発をお願いします。データの前処理から、モデルの学習、評価、デプロイまでの一連の作業を含みます。',
 '{"data_size": "100万件以上", "accuracy_target": "90%以上", "deployment": "本番環境へのデプロイ"}',
 '3-6ヶ月',
 '{"min": 3000000, "max": 10000000}',
 ARRAY['学習済みモデル', 'APIエンドポイント', '技術ドキュメント', '性能評価レポート'],
 ARRAY['Python', 'TensorFlow/PyTorch', 'MLOps', 'クラウドプラットフォーム']),

-- 開発者向けテンプレート
('developer', 'chatbot_development', 'AIチャットボット開発',
 'ChatGPT APIを活用した業務用チャットボットの開発をお願いします。自社の業務知識を学習させ、社内問い合わせ対応を自動化したいです。',
 '{"integration": "既存システムとの連携", "customization": "業務特化のカスタマイズ", "ui": "Webインターフェース"}',
 '1-3ヶ月',
 '{"min": 1000000, "max": 3000000}',
 ARRAY['チャットボットシステム', 'APIドキュメント', '運用マニュアル', 'ソースコード'],
 ARRAY['ChatGPT API', 'Python/JavaScript', 'Web開発', 'データベース']),

-- 活用者向けテンプレート
('user', 'content_creation', 'AI活用コンテンツ制作支援',
 'ChatGPTやClaudeを活用した効率的なコンテンツ制作の支援をお願いします。プロンプトエンジニアリングによる品質向上と、作業効率化を実現したいです。',
 '{"content_type": "ブログ記事、SNS投稿、プレスリリース", "volume": "月間50本程度", "quality": "人間レベルの品質"}',
 '1ヶ月〜継続',
 '{"min": 300000, "max": 800000}',
 ARRAY['プロンプトテンプレート集', 'コンテンツ制作ガイドライン', 'サンプルコンテンツ', '効果測定レポート'],
 ARRAY['ChatGPT/Claude', 'プロンプトエンジニアリング', 'コンテンツマーケティング']),

-- 支援者向けテンプレート
('supporter', 'ai_consulting', 'AI導入コンサルティング',
 '自社へのAI導入に向けた戦略立案と実行支援をお願いします。現状分析から、導入計画の策定、POCの実施、社内教育まで包括的な支援を求めています。',
 '{"assessment": "現状分析とギャップ分析", "roadmap": "段階的導入計画", "education": "社員向け研修"}',
 '3-6ヶ月',
 '{"min": 2000000, "max": 5000000}',
 ARRAY['AI導入戦略書', '導入ロードマップ', 'POC結果レポート', '研修資料'],
 ARRAY['AI戦略立案', 'プロジェクトマネジメント', '研修講師経験', '業界知識']);

-- =====================================================
-- 7. ビューの作成（オプション）
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
-- 8. 関数の作成
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

-- コメント追加
COMMENT ON TABLE public.ai_skills IS 'AI人材の詳細スキル情報';
COMMENT ON TABLE public.matching_scores IS 'プロジェクトとAI人材のマッチングスコア';
COMMENT ON TABLE public.ai_use_cases IS 'AI活用事例・ポートフォリオ';
COMMENT ON TABLE public.project_templates IS 'AI案件テンプレート';