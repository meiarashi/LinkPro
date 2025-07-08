-- AI人材マッチング機能のテーブル構造確認SQL
-- 実行日: 2025-01-08

-- =====================================================
-- 1. 作成されたテーブルの確認
-- =====================================================
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('ai_skills', 'matching_scores', 'ai_use_cases', 'project_templates')
ORDER BY table_name;

-- =====================================================
-- 2. 各テーブルのカラム構造確認
-- =====================================================

-- ai_skillsテーブルの構造
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ai_skills'
ORDER BY ordinal_position;

-- matching_scoresテーブルの構造
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    numeric_precision,
    numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'matching_scores'
ORDER BY ordinal_position;

-- ai_use_casesテーブルの構造
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'ai_use_cases'
ORDER BY ordinal_position;

-- project_templatesテーブルの構造
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'project_templates'
ORDER BY ordinal_position;

-- =====================================================
-- 3. インデックスの確認
-- =====================================================
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('ai_skills', 'matching_scores', 'ai_use_cases', 'project_templates')
ORDER BY tablename, indexname;

-- =====================================================
-- 4. 制約の確認
-- =====================================================
SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
AND tc.table_name IN ('ai_skills', 'matching_scores', 'ai_use_cases', 'project_templates')
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- =====================================================
-- 5. RLSポリシーの確認
-- =====================================================
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('ai_skills', 'matching_scores', 'ai_use_cases', 'project_templates')
ORDER BY tablename, policyname;

-- =====================================================
-- 6. トリガーの確認
-- =====================================================
SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('ai_skills', 'matching_scores', 'ai_use_cases', 'project_templates')
ORDER BY event_object_table, trigger_name;

-- =====================================================
-- 7. ビューの確認
-- =====================================================
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('ai_talent_profiles', 'project_matching_candidates');

-- =====================================================
-- 8. 関数の確認
-- =====================================================
SELECT 
    routine_name,
    routine_type,
    data_type,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN ('calculate_matching_score', 'update_updated_at_column');

-- =====================================================
-- 9. 初期データの確認
-- =====================================================
SELECT 
    COUNT(*) as total_templates,
    COUNT(DISTINCT skill_level) as skill_levels,
    COUNT(DISTINCT category) as categories
FROM public.project_templates;

SELECT 
    skill_level,
    COUNT(*) as count
FROM public.project_templates
GROUP BY skill_level
ORDER BY skill_level;

-- =====================================================
-- 10. テーブルのコメント確認
-- =====================================================
SELECT 
    schemaname,
    tablename,
    obj_description(pgc.oid, 'pg_class') AS table_comment
FROM pg_catalog.pg_class pgc
JOIN pg_catalog.pg_namespace pgn ON pgn.oid = pgc.relnamespace
JOIN information_schema.tables ist ON ist.table_schema = pgn.nspname AND ist.table_name = pgc.relname
WHERE pgn.nspname = 'public'
AND pgc.relname IN ('ai_skills', 'matching_scores', 'ai_use_cases', 'project_templates');