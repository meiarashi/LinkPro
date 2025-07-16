"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { createClient } from "../../utils/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ProjectAnalysis {
  required_ai_level: string;
  required_ai_tools: string[];
  business_domain: string;
  project_difficulty: string;
  project_type: string;
  estimated_budget_range?: { min: number; max: number };
  key_requirements: string[];
  success_criteria: string[];
}

interface AIProjectWizardProps {
  onComplete: (analysis: ProjectAnalysis, conversation: Message[], conversationId?: string) => void;
}

export default function AIProjectWizard({ onComplete }: AIProjectWizardProps) {
  const supabase = createClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `こんにちは！AIを活用してどんなことを実現したいですか？

例えば：
• 「社内でChatGPTを使い始めたが、うまく活用できていない」
• 「営業メールの作成を効率化したい」
• 「大量のデータから分析レポートを自動生成したい」
• 「カスタマーサポートをAIで効率化したい」

どんなお悩みでもお気軽にお話しください。`
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<ProjectAnalysis | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 会話履歴の作成または更新
  const saveConversation = async (newMessages: Message[], newAnalysis?: ProjectAnalysis) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (!conversationId) {
        // 新規作成
        const { data, error } = await supabase
          .from('ai_conversations')
          .insert({
            user_id: user.id,
            conversation_type: 'project_creation',
            messages: newMessages,
            analysis: newAnalysis || analysis,
            status: 'in_progress'
          })
          .select()
          .single();

        if (!error && data) {
          setConversationId(data.id);
        }
      } else {
        // 更新
        await supabase
          .from('ai_conversations')
          .update({
            messages: newMessages,
            analysis: newAnalysis || analysis,
            updated_at: new Date().toISOString()
          })
          .eq('id', conversationId);
      }
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user" as const, content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // まず要件を分析
      const analyzeResponse = await fetch("/api/analyze-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages,
          currentProjectInfo: analysis || {}
        })
      });

      const analyzeData = await analyzeResponse.json();
      
      if (analyzeData.success) {
        setAnalysis(analyzeData.analysis);
        setSuggestedQuestions(analyzeData.suggestedQuestions || []);
      }

      // 次に対話型の応答を生成
      const chatResponse = await fetch("/api/chat-with-ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: newMessages,
          currentAnalysis: analyzeData.analysis || analysis || {}
        })
      });

      const chatData = await chatResponse.json();
      
      if (chatData.success) {
        const updatedMessages = [...newMessages, { role: "assistant", content: chatData.message }];
        setMessages(updatedMessages);
        
        // 会話履歴を保存
        await saveConversation(updatedMessages, analyzeData.analysis);
        
        // 要件が十分に集まったかチェック
        if (chatData.isComplete && newMessages.length > 6) {
          // 完了ボタンを表示するためのフラグを立てる（既存のロジックを使用）
        }
      }
    } catch (error) {
      console.error("Error in conversation:", error);
      setMessages([...newMessages, { 
        role: "assistant", 
        content: "申し訳ございません。エラーが発生しました。もう一度お試しください。" 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // この関数は不要になったが、後方互換性のため残す
  const generateAIResponse = (analysis: ProjectAnalysis, messageCount: number): string => {
    return ""; // 実際の応答はchat-with-aiエンドポイントで生成
  };

  const completeWizard = async () => {
    if (analysis && conversationId) {
      // 会話を完了状態に更新
      await supabase
        .from('ai_conversations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', conversationId);
      
      // 親コンポーネントにconversationIdも渡す
      onComplete(analysis, messages, conversationId);
    }
  };

  const useSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* ヘッダー */}
      <div className="p-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          AIアシスタント
        </h3>
      </div>

      {/* メッセージエリア */}
      <div className="h-[500px] overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div className={`flex gap-3 max-w-[80%] ${
              message.role === "user" ? "flex-row-reverse" : ""
            }`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                message.role === "user" 
                  ? "bg-blue-600 text-white" 
                  : "bg-gray-200 text-gray-600"
              }`}>
                {message.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`rounded-lg px-4 py-3 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}>
                <div className={`whitespace-pre-wrap ${
                  message.role === "assistant" ? "space-y-2" : ""
                }`}>
                  {message.content}
                </div>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex gap-3 items-center text-gray-500">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              考えています...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      

      {/* 入力エリア */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              // Ctrl+Enter または Cmd+Enter で送信
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="メッセージを入力... (Ctrl+Enterで送信)"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4 py-2"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 完了ボタン */}
      {messages.length > 6 && analysis && analysis.key_requirements && analysis.key_requirements.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                プロジェクト案の準備ができました
              </p>
              <p className="text-xs text-green-600 mt-1">
                このままチャットを続けて要件を詰めることも可能です
              </p>
            </div>
            <Button 
              onClick={completeWizard} 
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              プロジェクトを作成
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}