-- matching_scoresテーブルの詳細確認

-- 1. matching_scoresテーブルの存在確認
SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'matching_scores'
) as matching_scores_exists;

-- 2. 名前が似ているテーブルの検索
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename LIKE '%match%' OR tablename LIKE '%score%'
ORDER BY tablename;

-- 3. 作成されたAIテーブルの詳細確認
SELECT 
    t.tablename,
    obj_description(c.oid, 'pg_class') as table_comment,
    pg_size_pretty(pg_total_relation_size(c.oid)) as size
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
WHERE t.schemaname = 'public'
AND t.tablename IN ('ai_skills', 'ai_use_cases', 'project_templates', 'matching_scores')
ORDER BY t.tablename;

-- 4. 各テーブルのレコード数確認
SELECT 'ai_skills' as table_name, COUNT(*) as record_count FROM public.ai_skills
UNION ALL
SELECT 'ai_use_cases', COUNT(*) FROM public.ai_use_cases
UNION ALL
SELECT 'project_templates', COUNT(*) FROM public.project_templates;

-- 5. project_templatesの内容確認（正しく登録されているか）
SELECT skill_level, category, title 
FROM public.project_templates 
ORDER BY skill_level, category;

-- 6. ビューの確認
SELECT viewname 
FROM pg_views 
WHERE schemaname = 'public' 
AND (viewname LIKE '%ai%' OR viewname LIKE '%match%')
ORDER BY viewname;

-- 7. 関数の確認
SELECT proname 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (proname LIKE '%match%' OR proname LIKE '%score%');