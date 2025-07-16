-- notifications テーブルに INSERT ポリシーを追加
-- システムがトリガー経由で通知を作成できるようにする

-- 既存のポリシーを確認（コメントとして記録）
-- Users can view own notifications (SELECT)
-- Users can update own notifications (UPDATE)

-- INSERT ポリシーを追加
-- 方法1: トリガーからの INSERT を許可（サービスロールで実行される）
CREATE POLICY "System can insert notifications" 
ON notifications 
FOR INSERT 
WITH CHECK (true);

-- 方法2: より制限的なアプローチ（推奨）
-- ユーザーが自分宛の通知を作成できるようにする
CREATE POLICY "Users can create notifications for themselves" 
ON notifications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- 注意: 上記のどちらか一つを選択してください
-- トリガーから通知を作成する場合は、方法1が必要です
-- 現在の実装では、トリガーがサービスロールで実行されるため、方法1を使用します

-- 方法2のポリシーを削除（方法1を使用するため）
DROP POLICY IF EXISTS "Users can create notifications for themselves" ON notifications;