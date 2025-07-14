-- プロジェクトが公開された時に自動でマッチングスコアを計算するトリガー

-- 1. Edge Functionを呼び出すための関数を作成
CREATE OR REPLACE FUNCTION trigger_matching_calculation()
RETURNS TRIGGER AS $$
DECLARE
  pro_count INTEGER;
BEGIN
  -- プロジェクトが公開された場合のみ処理
  IF NEW.status = 'public' AND (OLD.status IS NULL OR OLD.status != 'public') THEN
    -- プロフェッショナルの数を確認（大量の計算を避けるため）
    SELECT COUNT(*) INTO pro_count
    FROM profiles
    WHERE user_type = 'pro' 
    AND deleted_at IS NULL
    AND profile_details->>'ai_skills' IS NOT NULL;
    
    -- プロ人材が存在する場合のみ処理
    IF pro_count > 0 THEN
      -- 既存のマッチングスコアを削除
      DELETE FROM matching_scores WHERE project_id = NEW.id;
      
      -- すべてのプロ人材に対してマッチングスコアを計算
      INSERT INTO matching_scores (
        project_id,
        ai_talent_id,
        pro_id,
        level_match_score,
        tool_match_score,
        domain_match_score,
        experience_score,
        availability_score,
        total_score,
        match_percentage,
        recommendation_reason,
        match_details
      )
      SELECT
        NEW.id,
        p.id,
        p.id,
        -- レベルマッチスコア（30点満点）
        CASE
          WHEN NEW.pro_requirements->>'required_ai_level' = p.profile_details->'ai_skills'->>0 THEN 30
          WHEN NEW.pro_requirements->>'required_ai_level' = 'user' AND p.profile_details->'ai_skills'->>0 = 'developer' THEN 25
          WHEN NEW.pro_requirements->>'required_ai_level' = 'user' AND p.profile_details->'ai_skills'->>0 = 'expert' THEN 25
          WHEN NEW.pro_requirements->>'required_ai_level' = 'developer' AND p.profile_details->'ai_skills'->>0 = 'expert' THEN 25
          WHEN NEW.pro_requirements->>'required_ai_level' = 'supporter' THEN 20
          ELSE 10
        END AS level_match_score,
        
        -- ツールマッチスコア（25点満点）
        CASE
          WHEN jsonb_array_length(NEW.pro_requirements->'required_ai_tools') = 0 THEN 20
          ELSE LEAST(25, 
            (
              SELECT COUNT(*) * 25.0 / NULLIF(jsonb_array_length(NEW.pro_requirements->'required_ai_tools'), 0)
              FROM jsonb_array_elements_text(NEW.pro_requirements->'required_ai_tools') AS required_tool
              WHERE p.profile_details->'ai_tools' ? required_tool
            )
          )
        END AS tool_match_score,
        
        -- 業務領域スコア（20点満点）
        CASE
          WHEN NEW.pro_requirements->>'business_domain' IS NULL THEN 10
          WHEN p.profile_details->'ai_experience'->'domains' ? (NEW.pro_requirements->>'business_domain') THEN 20
          WHEN jsonb_array_length(p.profile_details->'ai_experience'->'domains') > 0 THEN 10
          ELSE 5
        END AS domain_match_score,
        
        -- 経験年数スコア（15点満点）
        CASE
          WHEN NEW.pro_requirements->>'project_difficulty' = 'beginner' THEN
            CASE
              WHEN COALESCE((p.profile_details->'ai_experience'->>'years')::NUMERIC, 0) >= 0.5 THEN 15
              ELSE 10
            END
          WHEN NEW.pro_requirements->>'project_difficulty' = 'intermediate' THEN
            CASE
              WHEN COALESCE((p.profile_details->'ai_experience'->>'years')::NUMERIC, 0) >= 1.5 THEN 15
              WHEN COALESCE((p.profile_details->'ai_experience'->>'years')::NUMERIC, 0) >= 1 THEN 10
              ELSE 5
            END
          WHEN NEW.pro_requirements->>'project_difficulty' = 'advanced' THEN
            CASE
              WHEN COALESCE((p.profile_details->'ai_experience'->>'years')::NUMERIC, 0) >= 3 THEN 15
              WHEN COALESCE((p.profile_details->'ai_experience'->>'years')::NUMERIC, 0) >= 2 THEN 10
              ELSE 5
            END
          ELSE 10
        END AS experience_score,
        
        -- 稼働可能性スコア（10点満点）- 現在は全員10点
        10 AS availability_score,
        
        -- 合計スコア
        0 AS total_score, -- 後で更新
        0 AS match_percentage, -- 後で更新
        
        -- マッチング理由（簡易版）
        CASE
          WHEN NEW.pro_requirements->>'required_ai_level' = p.profile_details->'ai_skills'->>0 THEN 'スキルレベルが要件に適合。'
          ELSE ''
        END ||
        CASE
          WHEN (
            SELECT COUNT(*)
            FROM jsonb_array_elements_text(NEW.pro_requirements->'required_ai_tools') AS required_tool
            WHERE p.profile_details->'ai_tools' ? required_tool
          ) > 0 THEN '必要なAIツールの経験あり。'
          ELSE ''
        END AS recommendation_reason,
        
        -- マッチ詳細
        jsonb_build_object(
          'required_level', NEW.pro_requirements->>'required_ai_level',
          'profile_level', p.profile_details->'ai_skills'->>0,
          'matched_tools', (
            SELECT jsonb_agg(required_tool)
            FROM jsonb_array_elements_text(NEW.pro_requirements->'required_ai_tools') AS required_tool
            WHERE p.profile_details->'ai_tools' ? required_tool
          )
        ) AS match_details
        
      FROM profiles p
      WHERE p.user_type = 'pro' 
      AND p.deleted_at IS NULL
      AND p.profile_details->>'ai_skills' IS NOT NULL;
      
      -- 合計スコアとパーセンテージを更新
      UPDATE matching_scores
      SET 
        total_score = level_match_score + tool_match_score + domain_match_score + experience_score + availability_score,
        match_percentage = ROUND(level_match_score + tool_match_score + domain_match_score + experience_score + availability_score)
      WHERE project_id = NEW.id;
      
      -- 通知を作成（上位5名のみ）
      INSERT INTO notifications (
        user_id,
        type,
        title,
        content,
        related_project_id,
        read_status
      )
      SELECT 
        ms.ai_talent_id,
        'new_matching_project',
        'あなたにマッチする新しいプロジェクトがあります',
        NEW.title || 'があなたのスキルにマッチしました（マッチ度: ' || ms.match_percentage || '%）',
        NEW.id,
        false
      FROM matching_scores ms
      WHERE ms.project_id = NEW.id
      ORDER BY ms.total_score DESC
      LIMIT 5;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. トリガーを作成
DROP TRIGGER IF EXISTS on_project_publish_calculate_matching ON projects;
CREATE TRIGGER on_project_publish_calculate_matching
  AFTER INSERT OR UPDATE OF status ON projects
  FOR EACH ROW
  EXECUTE FUNCTION trigger_matching_calculation();

-- 3. コメントを追加
COMMENT ON FUNCTION trigger_matching_calculation() IS 'プロジェクトが公開された時に自動でマッチングスコアを計算';
COMMENT ON TRIGGER on_project_publish_calculate_matching ON projects IS 'プロジェクト公開時のマッチング計算トリガー';