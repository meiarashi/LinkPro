-- AI人材マッチング機能追加前のバックアップ用SQL
-- 実行日: 2025-01-08
-- 
-- このSQLは既存データのバックアップを作成するためのものです。
-- 万が一の場合に備えて、実行前に以下のバックアップを取ることを推奨します。

-- 1. 既存のprofilesテーブルのprofile_detailsをバックアップ
CREATE TABLE IF NOT EXISTS public.profiles_backup_20250108 AS 
SELECT * FROM public.profiles;

-- 2. 既存のprojectsテーブルのpm_requirementsをバックアップ  
CREATE TABLE IF NOT EXISTS public.projects_backup_20250108 AS
SELECT * FROM public.projects;

-- バックアップテーブルの確認
-- SELECT COUNT(*) FROM public.profiles_backup_20250108;
-- SELECT COUNT(*) FROM public.projects_backup_20250108;

-- ロールバック時の手順（必要な場合のみ）
-- 1. 新規テーブルを削除
-- DROP TABLE IF EXISTS public.ai_skills CASCADE;
-- DROP TABLE IF EXISTS public.matching_scores CASCADE;
-- DROP TABLE IF EXISTS public.ai_use_cases CASCADE;
-- DROP TABLE IF EXISTS public.project_templates CASCADE;
-- 
-- 2. ビューを削除
-- DROP VIEW IF EXISTS public.ai_talent_profiles;
-- DROP VIEW IF EXISTS public.project_matching_candidates;
-- 
-- 3. 関数を削除
-- DROP FUNCTION IF EXISTS calculate_matching_score(JSONB, JSONB);
-- DROP FUNCTION IF EXISTS update_updated_at_column();