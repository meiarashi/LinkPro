-- matching_scoresテーブルの制約を修正
-- 現在の制約は0-1の範囲だが、実際のスコアは0-100の範囲

-- 1. 既存の制約を削除
ALTER TABLE matching_scores 
  DROP CONSTRAINT IF EXISTS matching_scores_level_match_score_check,
  DROP CONSTRAINT IF EXISTS matching_scores_tool_match_score_check,
  DROP CONSTRAINT IF EXISTS matching_scores_domain_match_score_check,
  DROP CONSTRAINT IF EXISTS matching_scores_total_score_check;

-- 2. 新しい制約を追加（0-100の範囲）
ALTER TABLE matching_scores 
  ADD CONSTRAINT matching_scores_level_match_score_check 
    CHECK (level_match_score >= 0 AND level_match_score <= 30),
  ADD CONSTRAINT matching_scores_tool_match_score_check 
    CHECK (tool_match_score >= 0 AND tool_match_score <= 25),
  ADD CONSTRAINT matching_scores_domain_match_score_check 
    CHECK (domain_match_score >= 0 AND domain_match_score <= 20),
  ADD CONSTRAINT matching_scores_total_score_check 
    CHECK (total_score >= 0 AND total_score <= 100);

-- 3. 追加のカラムがある場合の制約も追加
ALTER TABLE matching_scores 
  ADD CONSTRAINT matching_scores_experience_score_check 
    CHECK (experience_score >= 0 AND experience_score <= 15),
  ADD CONSTRAINT matching_scores_availability_score_check 
    CHECK (availability_score >= 0 AND availability_score <= 10);

-- 4. match_percentageカラムがある場合の制約
ALTER TABLE matching_scores 
  ADD CONSTRAINT matching_scores_match_percentage_check 
    CHECK (match_percentage >= 0 AND match_percentage <= 100);

-- 5. データ型も確認・修正
ALTER TABLE matching_scores 
  ALTER COLUMN level_match_score TYPE NUMERIC(5,2),
  ALTER COLUMN tool_match_score TYPE NUMERIC(5,2),
  ALTER COLUMN domain_match_score TYPE NUMERIC(5,2),
  ALTER COLUMN total_score TYPE NUMERIC(5,2);

-- 6. experience_scoreとavailability_scoreカラムが存在しない場合は追加
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

-- 7. テーブル構造を確認
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale,
  column_default
FROM information_schema.columns 
WHERE table_name = 'matching_scores'
ORDER BY ordinal_position;