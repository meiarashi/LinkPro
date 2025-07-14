# 自動マッチングトリガーのテスト手順

## 確認結果
✅ トリガー関数が正しく更新されています（通知テーブルのカラム名が修正済み）
✅ AIスキルを持つプロ人材が1名存在します

## テスト手順

### 方法1: 既存プロジェクトでテスト
1. Supabaseダッシュボードで以下のSQLを実行：

```sql
-- 既存のプロジェクトにAI要件を追加してテスト
UPDATE projects
SET pro_requirements = jsonb_build_object(
    'required_ai_level', 'developer',
    'required_ai_tools', '["ChatGPT", "Claude", "OpenAI API"]'::jsonb,
    'project_difficulty', 'intermediate',
    'business_domain', '営業支援'
),
status = 'draft'
WHERE id = 'ba16c865-1704-4b2c-830d-26871e24afa5';

-- ステータスを公開に変更してトリガーを起動
UPDATE projects
SET status = 'public'
WHERE id = 'ba16c865-1704-4b2c-830d-26871e24afa5';
```

### 方法2: アプリから新規プロジェクトを作成
1. LinkProアプリにクライアントとしてログイン
2. 「新規プロジェクト作成」をクリック
3. 以下の情報を入力：
   - **必要なAIレベル**: 開発者
   - **必要なAIツール**: ChatGPT, Claude, OpenAI API
   - **プロジェクト難易度**: 中級
   - **業務領域**: 営業支援
4. プロジェクトを保存後、ステータスを「公開」に変更

## 確認ポイント

### 1. マッチングスコアの確認
```sql
-- マッチングスコアが計算されているか確認
SELECT 
    ms.*,
    p.title as project_title,
    prof.full_name as professional_name
FROM matching_scores ms
LEFT JOIN projects p ON ms.project_id = p.id
LEFT JOIN profiles prof ON ms.ai_talent_id = prof.id
WHERE ms.project_id = 'ba16c865-1704-4b2c-830d-26871e24afa5'
ORDER BY ms.total_score DESC;
```

### 2. 通知の確認
```sql
-- 通知が作成されているか確認
SELECT * FROM notifications
WHERE type = 'new_matching_project'
AND related_id = 'ba16c865-1704-4b2c-830d-26871e24afa5'
ORDER BY created_at DESC;
```

## 期待される結果

### プロ人材（bdigdisk@gmail.com）のマッチング詳細：
- **レベルマッチ**: 30点（developer = developer）
- **ツールマッチ**: 25点（3/3ツールが一致）
- **業務領域**: 20点（営業支援が一致）
- **経験年数**: 5点（0年 < 1年）
- **稼働可能性**: 10点（固定）
- **合計**: 90点

### 通知：
- プロ人材（ID: 42331100-19ed-4709-a87b-6408a47e9ddc）に通知が送信される

## トラブルシューティング

### マッチングが計算されない場合：
1. プロジェクトのstatusが確実に'draft'から'public'に変更されているか確認
2. pro_requirementsフィールドが正しく設定されているか確認
3. プロ人材のprofile_detailsにai_skillsが設定されているか確認

### 通知が作成されない場合：
1. matching_scoresテーブルにレコードが作成されているか確認
2. notificationsテーブルの構造が正しいか確認