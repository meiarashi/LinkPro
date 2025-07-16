-- AI対話履歴を保存するテーブル
CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL, -- プロジェクト作成後に紐付け
  conversation_type VARCHAR(50) NOT NULL DEFAULT 'project_creation', -- 対話の種類
  messages JSONB NOT NULL DEFAULT '[]', -- Message[]の配列
  analysis JSONB, -- 分析結果
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress', -- in_progress, completed, abandoned
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- インデックス
  CONSTRAINT valid_status CHECK (status IN ('in_progress', 'completed', 'abandoned'))
);

-- インデックス
CREATE INDEX idx_ai_conversations_user_id ON ai_conversations(user_id);
CREATE INDEX idx_ai_conversations_project_id ON ai_conversations(project_id);
CREATE INDEX idx_ai_conversations_created_at ON ai_conversations(created_at DESC);
CREATE INDEX idx_ai_conversations_status ON ai_conversations(status);

-- RLSポリシー
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分の会話履歴のみ閲覧可能
CREATE POLICY "Users can view own conversations" ON ai_conversations
  FOR SELECT USING (auth.uid() = user_id);

-- ユーザーは自分の会話履歴を作成可能
CREATE POLICY "Users can create own conversations" ON ai_conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ユーザーは自分の会話履歴を更新可能
CREATE POLICY "Users can update own conversations" ON ai_conversations
  FOR UPDATE USING (auth.uid() = user_id);

-- 管理者用のビュー（将来の分析用）
CREATE OR REPLACE VIEW ai_conversation_stats AS
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as total_conversations,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_conversations,
  COUNT(CASE WHEN project_id IS NOT NULL THEN 1 END) as converted_to_projects,
  AVG(JSONB_ARRAY_LENGTH(messages)) as avg_message_count
FROM ai_conversations
GROUP BY DATE_TRUNC('day', created_at);

-- コメント
COMMENT ON TABLE ai_conversations IS 'AI対話（プロジェクト作成ウィザード等）の履歴を保存';
COMMENT ON COLUMN ai_conversations.conversation_type IS '対話の種類（project_creation, consultation等）';
COMMENT ON COLUMN ai_conversations.messages IS '対話メッセージの配列 [{role: "user"|"assistant", content: string}]';
COMMENT ON COLUMN ai_conversations.analysis IS 'AIによる分析結果（project_requirements等）';
COMMENT ON COLUMN ai_conversations.status IS '対話のステータス（進行中、完了、放棄）';
COMMENT ON COLUMN ai_conversations.project_id IS '対話から作成されたプロジェクトのID';