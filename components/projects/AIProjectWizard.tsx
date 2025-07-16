"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "../ui/button";
import { Send, Bot, User, Loader2 } from "lucide-react";

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
  onComplete: (analysis: ProjectAnalysis, conversation: Message[]) => void;
}

export default function AIProjectWizard({ onComplete }: AIProjectWizardProps) {
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
        setMessages([...newMessages, { role: "assistant", content: chatData.message }]);
        
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

  const completeWizard = () => {
    if (analysis) {
      onComplete(analysis, messages);
    }
  };

  const useSuggestedQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bot className="w-5 h-5 text-blue-600" />
          AI案件作成アシスタント
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          対話しながら、最適なAI人材とマッチングするための要件を整理します
        </p>
      </div>

      {/* メッセージエリア */}
      <div className="h-96 overflow-y-auto p-4 space-y-4">
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
              <div className={`rounded-lg px-4 py-2 ${
                message.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}>
                {message.content}
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

      {/* 提案される質問 */}
      {suggestedQuestions.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">質問の提案：</p>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question, index) => (
              <button
                key={index}
                onClick={() => useSuggestedQuestion(question)}
                className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* 初回のみ表示する例文 */}
      {messages.length === 1 && (
        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-2">クリックして入力：</p>
          <div className="grid grid-cols-1 gap-2">
            {[
              "社内でChatGPTを導入したが、使い方がバラバラで効果が出ていない",
              "顧客からの問い合わせ対応を自動化したい",
              "毎月の売上レポート作成に時間がかかりすぎている",
              "AIを使って新しいビジネスを始めたいが、何から始めればいいか分からない"
            ].map((example, index) => (
              <button
                key={index}
                onClick={() => setInput(example)}
                className="text-left text-sm px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 入力エリア */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && sendMessage()}
            placeholder="メッセージを入力..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <Button
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="px-4"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* 完了ボタン */}
      {messages.length > 6 && analysis && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">要件の整理が完了しました</p>
              <p className="text-xs text-gray-600 mt-1">
                {analysis.business_domain}での{analysis.project_type === 'training' ? '支援' : '開発'}案件として登録します
              </p>
            </div>
            <Button onClick={completeWizard} className="bg-green-600 hover:bg-green-700">
              プロジェクトを作成
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}