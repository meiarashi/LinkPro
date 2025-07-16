-- matching_scoresテーブルの制約を修正（ビューを考慮）
-- ビューが依存しているため、一度ビューを削除してから制約を修正

-- 1. 依存しているビューを一時的に削除
DROP VIEW IF EXISTS project_matching_candidates CASCADE;

-- 2. 既存の制約を削除
ALTER TABLE matching_scores 
  DROP CONSTRAINT IF EXISTS matching_scores_level_match_score_check,
  DROP CONSTRAINT IF EXISTS matching_scores_tool_match_score_check,
  DROP CONSTRAINT IF EXISTS matching_scores_domain_match_score_check,
  DROP CONSTRAINT IF EXISTS matching_scores_total_score_check,
  DROP CONSTRAINT IF EXISTS matching_scores_experience_score_check,
  DROP CONSTRAINT IF EXISTS matching_scores_availability_score_check,
  DROP CONSTRAINT IF EXISTS matching_scores_match_percentage_check;

-- 3. データ型を修正
ALTER TABLE matching_scores 
  ALTER COLUMN level_match_score TYPE NUMERIC(5,2),
  ALTER COLUMN tool_match_score TYPE NUMERIC(5,2),
  ALTER COLUMN domain_match_score TYPE NUMERIC(5,2),
  ALTER COLUMN total_score TYPE NUMERIC(5,2);

-- 4. 不足しているカラムを追加
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'matching_scores' 
                AND column_name = 'experience_score') THEN
    ALTER TABLE matching_scores ADD COLUMN experience_score NUMERIC(5,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'matching_scores' 
                AND column_name = 'availability_score') THEN
    ALTER TABLE matching_scores ADD COLUMN availability_score NUMERIC(5,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'matching_scores' 
                AND column_name = 'match_percentage') THEN
    ALTER TABLE matching_scores ADD COLUMN match_percentage NUMERIC(5,2) DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'matching_scores' 
                AND column_name = 'pro_id') THEN
    ALTER TABLE matching_scores ADD COLUMN pro_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 5. 新しい制約を追加（0-100の範囲）
ALTER TABLE matching_scores 
  ADD CONSTRAINT matching_scores_level_match_score_check 
    CHECK (level_match_score >= 0 AND level_match_score <= 30),
  ADD CONSTRAINT matching_scores_tool_match_score_check 
    CHECK (tool_match_score >= 0 AND tool_match_score <= 25),
  ADD CONSTRAINT matching_scores_domain_match_score_check 
    CHECK (domain_match_score >= 0 AND domain_match_score <= 20),
  ADD CONSTRAINT matching_scores_experience_score_check 
    CHECK (experience_score >= 0 AND experience_score <= 15),
  ADD CONSTRAINT matching_scores_availability_score_check 
    CHECK (availability_score >= 0 AND availability_score <= 10),
  ADD CONSTRAINT matching_scores_total_score_check 
    CHECK (total_score >= 0 AND total_score <= 100),
  ADD CONSTRAINT matching_scores_match_percentage_check 
    CHECK (match_percentage >= 0 AND match_percentage <= 100);

-- 6. ビューを再作成
CREATE OR REPLACE VIEW project_matching_candidates AS
SELECT 
  ms.id,
  ms.project_id,
  p.title as project_title,
  p.client_id,
  ms.ai_talent_id,
  pr.full_name as talent_name,
  ms.total_score,
  ms.match_percentage,
  ms.level_match_score,
  ms.tool_match_score,
  ms.domain_match_score,
  ms.experience_score,
  ms.availability_score,
  ms.recommendation_reason,
  ms.calculated_at
FROM matching_scores ms
JOIN projects p ON p.id = ms.project_id
JOIN profiles pr ON pr.id = ms.ai_talent_id
ORDER BY ms.total_score DESC;

-- 7. 確認用クエリ
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'matching_scores'
ORDER BY ordinal_position;

-- 8. 制約の確認
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'matching_scores'::regclass
  AND contype = 'c';