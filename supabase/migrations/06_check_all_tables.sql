-- 全てのスキーマとテーブルを確認するSQL

-- 1. 利用可能なスキーマの確認
SELECT schema_name 
FROM information_schema.schemata
WHERE schema_name NOT IN ('pg_catalog', 'information_schema')
ORDER BY schema_name;

-- 2. publicスキーマの全テーブル確認
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 3. AI関連テーブルの存在確認（全スキーマ）
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_name IN ('ai_skills', 'matching_scores', 'ai_use_cases', 'project_templates')
ORDER BY table_schema, table_name;

-- 4. 既存のプロジェクト関連テーブル確認
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'projects', 'applications', 'conversations', 'messages', 'notifications', 'saved_searches')
ORDER BY table_name;

-- 5. 最近作成されたテーブルの確認（作成時刻順）
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 6. SQLエラーログの確認（もしテーブル作成に失敗していた場合）
-- 注：この機能は権限によって利用できない場合があります
-- SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction';

-- 7. project_templatesテーブルの存在を別の方法で確認
SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'project_templates'
);

-- 8. ai_skillsテーブルの存在を別の方法で確認
SELECT EXISTS (
    SELECT FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'ai_skills'
);