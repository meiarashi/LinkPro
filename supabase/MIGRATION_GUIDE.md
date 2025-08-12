# Supabase Migration ガイド

## 概要
このドキュメントは、Supabaseでのマイグレーション作成時に遭遇する一般的な問題と解決策をまとめたものです。

## PostgreSQL/Supabase特有の構文制限

### 1. CREATE POLICY での IF NOT EXISTS
**問題:**
```sql
-- これはエラーになる
CREATE POLICY IF NOT EXISTS "policy_name" ON table_name
```

**解決策:**
```sql
-- IF NOT EXISTS は使用できない
CREATE POLICY "policy_name" ON table_name
```

**対処法:**
ポリシーを再作成する場合は、先に削除してから作成する：
```sql
DROP POLICY IF EXISTS "policy_name" ON table_name;
CREATE POLICY "policy_name" ON table_name
  FOR SELECT USING (条件);
```

### 2. カラム削除時の依存関係エラー

**問題:**
```
ERROR: 2BP01: cannot drop column because other objects depend on it
```

**原因:**
- トリガー
- RLSポリシー
- ビュー
- 関数
などがそのカラムに依存している

**解決策:**
依存オブジェクトを一時的に削除してから、カラム変更後に再作成：
```sql
-- 1. 依存オブジェクトを削除
DROP TRIGGER IF EXISTS trigger_name ON table_name;
DROP POLICY IF EXISTS policy_name ON table_name;

-- 2. カラムの変更を実行
ALTER TABLE table_name DROP COLUMN column_name;

-- 3. 依存オブジェクトを再作成
CREATE TRIGGER trigger_name ...;
CREATE POLICY policy_name ...;
```

### 3. ENUM型の取り扱い

**既存のENUM型の確認:**
```sql
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_type_name') THEN
        CREATE TYPE enum_type_name AS ENUM ('value1', 'value2');
    END IF;
END$$;
```

**ENUM型の値を追加（既存の型に）:**
```sql
ALTER TYPE enum_type_name ADD VALUE 'new_value';
```

### 4. SECURITY DEFINER vs SECURITY INVOKER

**重要:** ビューのセキュリティコンテキスト
- `SECURITY DEFINER`: ビュー作成者の権限で実行（危険な場合がある）
- `SECURITY INVOKER`: 実行ユーザーの権限で実行（推奨）

```sql
-- 推奨: RLSポリシーが適用される
CREATE VIEW view_name 
WITH (security_invoker = true) AS
SELECT ...;

-- 避けるべき: RLSポリシーがバイパスされる可能性
CREATE VIEW view_name 
SECURITY DEFINER AS
SELECT ...;
```

## マイグレーション作成のベストプラクティス

### 1. 冪等性を保つ
```sql
-- Good: 再実行可能
ADD COLUMN IF NOT EXISTS column_name TYPE;
CREATE INDEX IF NOT EXISTS index_name ON table_name(column);
DROP TRIGGER IF EXISTS trigger_name ON table_name;

-- Bad: 2回目の実行でエラー
ADD COLUMN column_name TYPE;
CREATE INDEX index_name ON table_name(column);
```

### 2. トランザクション制御
大きな変更は明示的にトランザクションで囲む：
```sql
BEGIN;
-- 複数の変更
COMMIT;
```

ただし、一部のDDL文（CREATE INDEX CONCURRENTLY等）はトランザクション外で実行する必要があります。

### 3. データ移行時の注意
```sql
-- データ移行前に必ずバックアップ相当の処理
-- 1. 新しいカラムを追加
ALTER TABLE table ADD COLUMN new_column TYPE;

-- 2. データを移行
UPDATE table SET new_column = old_column;

-- 3. 古いカラムを削除（依存関係を確認後）
ALTER TABLE table DROP COLUMN old_column;
```

## よくあるエラーと対処法

### エラー: syntax error at or near "NOT"
**原因:** CREATE文でIF NOT EXISTSがサポートされていない場所で使用
**対象:** CREATE POLICY, CREATE RULE など
**解決:** IF NOT EXISTSを削除し、必要なら事前にDROP文を実行

### エラー: column "xxx" does not exist
**原因:** マイグレーションの実行順序の問題
**解決:** 依存関係を考慮した順序でマイグレーションを作成

### エラー: permission denied for schema public
**原因:** Supabaseの権限設定
**解決:** 
```sql
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
```

## RLS (Row Level Security) の注意点

### 1. 必ず有効化
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### 2. デフォルトで全拒否
RLSを有効にすると、ポリシーがない限りアクセスできません。

### 3. service_roleの扱い
service_roleはRLSをバイパスします。セキュリティに注意。

## マイグレーションファイルの命名規則

```
YYYYMMDD_HHMMSS_description.sql
または
YYYYMMDD_description.sql
```

例:
- `20250812_fix_dependencies_and_add_project_status.sql`
- `20250812_143022_add_user_profiles.sql`

## デバッグとトラブルシューティング

### 依存関係の確認
```sql
-- テーブルの依存関係を確認
SELECT 
    dependent_ns.nspname AS dependent_schema,
    dependent_view.relname AS dependent_view,
    source_ns.nspname AS source_schema,
    source_table.relname AS source_table
FROM pg_depend 
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid 
JOIN pg_class AS dependent_view ON pg_rewrite.ev_class = dependent_view.oid 
JOIN pg_class AS source_table ON pg_depend.refobjid = source_table.oid 
JOIN pg_namespace AS dependent_ns ON dependent_view.relnamespace = dependent_ns.oid
JOIN pg_namespace AS source_ns ON source_table.relnamespace = source_ns.oid
WHERE 
    source_ns.nspname = 'public'
    AND source_table.relname = 'your_table_name';
```

### ポリシーの確認
```sql
-- テーブルのRLSポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'your_table_name';
```

## Supabase CLIでのマイグレーション実行

### ローカルでの実行
```bash
supabase migration up --local
```

### リモートでの実行
```bash
supabase migration up --linked
```

### 新しいマイグレーションの作成
```bash
supabase migration new migration_name
```

## まとめ

1. **IF NOT EXISTS/IF EXISTS を活用**して冪等性を保つ
2. **依存関係を意識**してDROP → CREATE の順序を守る
3. **RLSポリシー作成時**はIF NOT EXISTSが使えないことに注意
4. **SECURITY INVOKER**を使用してRLSを適切に適用
5. **データ移行は慎重に**、必ず新カラム追加 → データ移行 → 旧カラム削除の順序で

このガイドラインに従うことで、Supabaseでのマイグレーション作成時のエラーを最小限に抑えることができます。