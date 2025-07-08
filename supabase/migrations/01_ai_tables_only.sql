-- ステップ1: AI関連の新規テーブルのみ作成
-- このSQLは新規テーブルの作成のみを行い、既存テーブルには影響しません

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