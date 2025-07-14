-- projectsテーブルのpro_requirementsカラムにAI要件を追加
-- 既存のJSONBカラムを活用してAI関連の要件を格納

-- 既存プロジェクトのpro_requirementsがNULLの場合、空のJSONオブジェクトを設定
UPDATE public.projects
SET pro_requirements = '{}'::jsonb
WHERE pro_requirements IS NULL;

-- AI要件のサンプル構造をコメントとして記録
COMMENT ON COLUMN public.projects.pro_requirements IS 'プロフェッショナル要件（AI要件を含む）
例：
{
  "required_ai_level": "developer",              // 必須：expert/developer/user/supporter
  "required_ai_tools": ["ChatGPT", "Python"],    // 必須：必要なAIツールリスト
  "project_difficulty": "intermediate",          // 必須：beginner/intermediate/advanced
  "business_domain": "営業支援",                 // オプション：業務領域
  "expected_outcomes": ["自動化", "効率化"],     // オプション：期待する成果
  "preferred_experience_years": 2                // オプション：望ましい経験年数
}';