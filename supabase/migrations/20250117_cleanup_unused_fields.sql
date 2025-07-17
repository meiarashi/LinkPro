-- 20250117_cleanup_unused_fields.sql
-- 使用されなくなったフィールドのクリーンアップ

-- 1. projectsテーブルからrequired_skillsカラムを削除
ALTER TABLE projects 
DROP COLUMN IF EXISTS required_skills;

-- 2. pro_requirementsからbusiness_domainを削除（既存データの更新）
UPDATE projects 
SET pro_requirements = pro_requirements - 'business_domain'
WHERE pro_requirements ? 'business_domain';

-- 3. マッチングスコア計算関数を更新（business_domain関連の計算を削除）
CREATE OR REPLACE FUNCTION calculate_matching_scores_for_project()
RETURNS TRIGGER AS $$
DECLARE
  pro_user RECORD;
  level_score NUMERIC;
  tool_score NUMERIC;
  experience_score NUMERIC;
  availability_score NUMERIC;
  total_score NUMERIC;
  rank_num INTEGER;
BEGIN
  -- プロジェクトが公開されていない場合は何もしない
  IF NEW.status != 'public' THEN
    RETURN NEW;
  END IF;

  -- 既存のマッチングスコアを削除
  DELETE FROM matching_scores WHERE project_id = NEW.id;

  -- AI要件が設定されていない場合は何もしない
  IF NEW.pro_requirements IS NULL OR 
     NEW.pro_requirements->>'required_ai_level' IS NULL THEN
    RETURN NEW;
  END IF;

  -- すべてのプロ人材に対してスコアを計算
  FOR pro_user IN 
    SELECT p.*, pd.profile_details
    FROM profiles p
    LEFT JOIN profiles pd ON p.id = pd.id
    WHERE p.user_type = 'pro'
  LOOP
    -- レベル適合度（30点満点）
    level_score := CASE
      WHEN pro_user.profile_details->>'ai_level' = NEW.pro_requirements->>'required_ai_level' THEN 30
      WHEN pro_user.profile_details->>'ai_level' = 'expert' THEN 25
      WHEN pro_user.profile_details->>'ai_level' = 'developer' AND NEW.pro_requirements->>'required_ai_level' IN ('user', 'supporter') THEN 20
      WHEN pro_user.profile_details->>'ai_level' = 'user' AND NEW.pro_requirements->>'required_ai_level' = 'supporter' THEN 15
      ELSE 5
    END;

    -- AIツール一致度（25点満点）
    IF NEW.pro_requirements->'required_ai_tools' IS NOT NULL AND 
       jsonb_array_length(NEW.pro_requirements->'required_ai_tools') > 0 THEN
      WITH tool_matches AS (
        SELECT COUNT(*) as match_count
        FROM jsonb_array_elements_text(NEW.pro_requirements->'required_ai_tools') AS required_tool
        WHERE required_tool = ANY(ARRAY(SELECT jsonb_array_elements_text(pro_user.profile_details->'ai_tools')))
      )
      SELECT 
        CASE 
          WHEN match_count > 0 THEN 
            LEAST(25, (match_count::NUMERIC / jsonb_array_length(NEW.pro_requirements->'required_ai_tools')::NUMERIC) * 25)
          ELSE 0
        END INTO tool_score
      FROM tool_matches;
    ELSE
      tool_score := 15; -- AIツール要件なしの場合
    END IF;

    -- 経験年数スコア（15点満点）
    experience_score := CASE
      WHEN (pro_user.profile_details->'ai_experience'->>'years')::INT >= 5 THEN 15
      WHEN (pro_user.profile_details->'ai_experience'->>'years')::INT >= 3 THEN 12
      WHEN (pro_user.profile_details->'ai_experience'->>'years')::INT >= 1 THEN 8
      ELSE 5
    END;

    -- 稼働可能性スコア（10点満点）
    availability_score := CASE
      WHEN pro_user.profile_details->>'availability' = 'full_time' THEN 10
      WHEN pro_user.profile_details->>'availability' = 'part_time' THEN 7
      ELSE 5
    END;

    -- 合計スコア（80点満点に変更、business_domainの20点を削除）
    total_score := level_score + tool_score + experience_score + availability_score;

    -- スコアを保存
    INSERT INTO matching_scores (
      project_id,
      ai_talent_id,
      level_match_score,
      tool_match_score,
      domain_match_score,
      experience_score,
      availability_score,
      total_score,
      calculated_at
    ) VALUES (
      NEW.id,
      pro_user.id,
      level_score,
      tool_score,
      0, -- domain_match_scoreは0に設定（将来的に削除予定）
      experience_score,
      availability_score,
      total_score,
      CURRENT_TIMESTAMP
    );
  END LOOP;

  -- 上位5名（同点含む）に通知を送信
  WITH ranked_scores AS (
    SELECT 
      ai_talent_id,
      total_score,
      DENSE_RANK() OVER (ORDER BY total_score DESC) as rank
    FROM matching_scores
    WHERE project_id = NEW.id
  ),
  top_talents AS (
    SELECT ai_talent_id
    FROM ranked_scores
    WHERE rank <= 5
  )
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    metadata,
    related_id,
    created_at
  )
  SELECT 
    tt.ai_talent_id,
    'project_match',
    'あなたにマッチする新しいプロジェクトが見つかりました',
    'プロジェクト「' || NEW.title || '」があなたのスキルにマッチしています。',
    jsonb_build_object(
      'project_id', NEW.id,
      'project_title', NEW.title,
      'match_score', ms.total_score
    ),
    NEW.id,
    CURRENT_TIMESTAMP
  FROM top_talents tt
  JOIN matching_scores ms ON ms.ai_talent_id = tt.ai_talent_id AND ms.project_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. project_templatesテーブルからrequired_skillsカラムを削除（存在する場合）
ALTER TABLE project_templates 
DROP COLUMN IF EXISTS required_skills;

-- 5. matching_scoresテーブルのdomain_match_scoreカラムを将来的に削除するための準備
-- （現時点では0に設定して保持、後のマイグレーションで削除）
COMMENT ON COLUMN matching_scores.domain_match_score IS 'DEPRECATED: Will be removed in future migration';

-- 6. 既存のマッチングスコアを再計算（オプション）
-- プロジェクトが多い場合はバッチ処理を検討
UPDATE projects 
SET updated_at = CURRENT_TIMESTAMP 
WHERE status = 'public' 
  AND pro_requirements IS NOT NULL 
  AND pro_requirements->>'required_ai_level' IS NOT NULL;