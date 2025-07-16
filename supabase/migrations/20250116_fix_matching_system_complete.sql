-- AI人材マッチングシステムの完全修正
-- 1. トリガー関数の修正（カラム名修正 + 同点処理）
-- 2. テストデータの追加

-- =====================================================
-- 1. トリガー関数の修正（最終版）
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_matching_calculation()
RETURNS TRIGGER AS $$
DECLARE
  pro_count INTEGER;
  fifth_score NUMERIC;
BEGIN
  -- プロジェクトが公開された場合のみ処理
  IF NEW.status = 'public' AND (OLD.status IS NULL OR OLD.status != 'public') THEN
    -- デバッグ用ログ
    RAISE NOTICE 'Project % is being published', NEW.id;
    
    -- プロフェッショナルの数を確認
    SELECT COUNT(*) INTO pro_count
    FROM profiles
    WHERE user_type = 'pro' 
    AND deleted_at IS NULL
    AND profile_details->>'ai_skills' IS NOT NULL;
    
    RAISE NOTICE 'Found % pro users with AI skills', pro_count;
    
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
          WHEN jsonb_array_length(COALESCE(NEW.pro_requirements->'required_ai_tools', '[]'::jsonb)) = 0 THEN 20
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
          WHEN jsonb_array_length(COALESCE(p.profile_details->'ai_experience'->'domains', '[]'::jsonb)) > 0 THEN 10
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
        
        -- 稼働可能性スコア（10点満点）
        10 AS availability_score,
        
        -- 合計スコア（計算は後で）
        0 AS total_score,
        0 AS match_percentage,
        
        -- マッチング理由
        CASE
          WHEN NEW.pro_requirements->>'required_ai_level' = p.profile_details->'ai_skills'->>0 THEN 'スキルレベルが要件に適合。'
          ELSE ''
        END ||
        CASE
          WHEN (
            SELECT COUNT(*)
            FROM jsonb_array_elements_text(COALESCE(NEW.pro_requirements->'required_ai_tools', '[]'::jsonb)) AS required_tool
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
            FROM jsonb_array_elements_text(COALESCE(NEW.pro_requirements->'required_ai_tools', '[]'::jsonb)) AS required_tool
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
      
      RAISE NOTICE 'Calculated scores for project %', NEW.id;
      
      -- 5位のスコアを取得
      SELECT total_score INTO fifth_score
      FROM matching_scores
      WHERE project_id = NEW.id
      ORDER BY total_score DESC
      LIMIT 1 OFFSET 4;
      
      -- 通知を作成
      IF fifth_score IS NULL THEN
        -- 5人未満の場合は全員に通知
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_id,
          related_type,
          is_read
        )
        SELECT 
          ms.ai_talent_id,
          'new_matching_project',
          'あなたにマッチする新しいプロジェクトがあります',
          NEW.title || 'があなたのスキルにマッチしました（マッチ度: ' || ms.match_percentage || '%）',
          NEW.id,
          'project',
          false
        FROM matching_scores ms
        WHERE ms.project_id = NEW.id
        ORDER BY ms.total_score DESC;
        
        RAISE NOTICE 'Created notifications for all % users', pro_count;
      ELSE
        -- 5位のスコア以上の人全員に通知
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          related_id,
          related_type,
          is_read
        )
        SELECT 
          ms.ai_talent_id,
          'new_matching_project',
          'あなたにマッチする新しいプロジェクトがあります',
          NEW.title || 'があなたのスキルにマッチしました（マッチ度: ' || ms.match_percentage || '%）',
          NEW.id,
          'project',
          false
        FROM matching_scores ms
        WHERE ms.project_id = NEW.id
          AND ms.total_score >= fifth_score
        ORDER BY ms.total_score DESC;
        
        RAISE NOTICE 'Created notifications for users with score >= %', fifth_score;
      END IF;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 2. テスト用: 既存プロジェクトにAI要件を追加
-- =====================================================
-- まず、公開中のプロジェクトを確認
DO $$
DECLARE
  proj RECORD;
BEGIN
  FOR proj IN 
    SELECT id, title, status, pro_requirements
    FROM projects
    WHERE status = 'public'
    LIMIT 3
  LOOP
    RAISE NOTICE 'Updating project: % - %', proj.id, proj.title;
    
    -- AI要件を設定（プロジェクトごとに異なる要件）
    IF proj.title LIKE '%Webサイト%' THEN
      UPDATE projects
      SET pro_requirements = jsonb_build_object(
        'required_ai_level', 'developer',
        'required_ai_tools', '["ChatGPT", "GitHub Copilot", "Claude"]'::jsonb,
        'business_domain', '開発支援',
        'project_difficulty', 'intermediate'
      )
      WHERE id = proj.id;
    ELSIF proj.title LIKE '%マーケティング%' THEN
      UPDATE projects
      SET pro_requirements = jsonb_build_object(
        'required_ai_level', 'user',
        'required_ai_tools', '["ChatGPT", "Midjourney"]'::jsonb,
        'business_domain', 'マーケティング',
        'project_difficulty', 'beginner'
      )
      WHERE id = proj.id;
    ELSE
      UPDATE projects
      SET pro_requirements = jsonb_build_object(
        'required_ai_level', 'developer',
        'required_ai_tools', '["ChatGPT", "Claude"]'::jsonb,
        'business_domain', '営業支援',
        'project_difficulty', 'intermediate'
      )
      WHERE id = proj.id;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- 3. トリガーを再発火させてマッチングスコアを計算
-- =====================================================
-- プロジェクトのステータスを一度変更してトリガーを発火
UPDATE projects 
SET status = 'draft'
WHERE status = 'public'
AND pro_requirements IS NOT NULL
AND pro_requirements != '{}'::jsonb;

UPDATE projects 
SET status = 'public'
WHERE status = 'draft'
AND pro_requirements IS NOT NULL
AND pro_requirements != '{}'::jsonb;

-- =====================================================
-- 4. 結果を確認
-- =====================================================
-- マッチングスコアの確認
SELECT 
  p.title as project_title,
  pr.full_name as pro_name,
  ms.total_score,
  ms.match_percentage,
  ms.recommendation_reason
FROM matching_scores ms
JOIN projects p ON p.id = ms.project_id
JOIN profiles pr ON pr.id = ms.ai_talent_id
ORDER BY p.title, ms.total_score DESC;

-- 通知の確認
SELECT 
  n.title,
  n.message,
  pr.full_name as recipient_name
FROM notifications n
JOIN profiles pr ON pr.id = n.user_id
WHERE n.type = 'new_matching_project'
ORDER BY n.created_at DESC;