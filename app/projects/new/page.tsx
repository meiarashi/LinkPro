"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { createClient } from "../../../utils/supabase/client";
import LoggedInHeader from "../../../components/LoggedInHeader";
import Link from "next/link";
import { ArrowLeft, Save, Eye, Loader2, Sparkles, Target, Brain, Users, Bot } from "lucide-react";
import { AI_SKILLS } from "../../../types/ai-talent";
import AIProjectWizard from "../../../components/projects/AIProjectWizard";
import { useToast } from "../../../components/ui/toast";
import { LoadingPage } from "../../../components/ui/loading";

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
}

export default function NewProjectPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [useAIWizard, setUseAIWizard] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    duration: "",
    status: "draft" as "draft" | "public" | "private",
    // AI要件
    required_ai_level: "",
    project_difficulty: "",
  });
  

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        router.push("/login");
        return;
      }
      
      setUser(currentUser);

      // プロフィール情報を取得
      const { data: profileData, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (error || !profileData) {
        console.error("Error fetching profile:", error);
        router.push("/dashboard");
        return;
      }

      // クライアントかチェック
      if (profileData.user_type !== 'client') {
        router.push("/dashboard");
        return;
      }

      setUserProfile(profileData);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };


  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = true) => {
    e.preventDefault();
    
    // バリデーション
    if (!formData.title.trim()) {
      addToast({
        type: "error",
        message: "タイトルを入力してください",
      });
      return;
    }
    
    if (!formData.description.trim()) {
      addToast({
        type: "error",
        message: "プロジェクトの説明を入力してください",
      });
      return;
    }
    
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error: insertError } = await supabase
        .from("projects")
        .insert({
          client_id: user.id,
          title: formData.title,
          description: formData.description,
          budget: formData.budget,
          duration: formData.duration,
          status: isDraft ? "draft" : formData.status,
          pro_requirements: {
            required_ai_level: formData.required_ai_level,
            project_difficulty: formData.project_difficulty,
          },
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // 会話IDがある場合は、プロジェクトと紐付ける
      if (conversationId && data.id) {
        await supabase
          .from('ai_conversations')
          .update({
            project_id: data.id
          })
          .eq('id', conversationId);
      }

      addToast({
        type: "success",
        message: isDraft ? "下書きを保存しました" : "プロジェクトを作成しました",
      });
      
      setTimeout(() => {
        router.push(`/projects/${data.id}`);
      }, 1000);
    } catch (err: any) {
      console.error("Error creating project:", err);
      addToast({
        type: "error",
        message: err.message || "プロジェクトの作成に失敗しました",
      });
      setError(err.message || "プロジェクトの作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>プロフィール情報が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 統一ヘッダー */}
      <LoggedInHeader userProfile={userProfile} userEmail={user?.email} />

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-8 max-w-4xl">
        {/* 戻るボタン */}
        <div className="mb-6">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              ダッシュボードに戻る
            </Button>
          </Link>
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">新規プロジェクト作成</h1>
          {!useAIWizard && (
            <Button
              type="button"
              onClick={() => setUseAIWizard(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Bot className="w-4 h-4" />
              AIアシスタントを使う
            </Button>
          )}
        </div>
        
        {useAIWizard ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                💡 AIアシスタントが会話を通じて、最適なAI人材とマッチングするための要件を整理します。
                完了後、内容を確認・編集してからプロジェクトを作成できます。
              </p>
            </div>
            <AIProjectWizard
              onComplete={(analysis, conversation, conversationId) => {
                // デバッグログ
                console.log('AIProjectWizard onComplete called with:', {
                  analysis,
                  analysisType: typeof analysis,
                  project_story: analysis.project_story,
                  project_story_type: typeof analysis.project_story,
                  key_requirements: analysis.key_requirements,
                  key_requirements_type: typeof analysis.key_requirements,
                  isArray: Array.isArray(analysis.key_requirements)
                });
                
                // AIの分析結果をフォームデータに反映（既存の値は上書き）
                // descriptionの設定を修正
                let description = formData.description;
                
                // project_storyが文字列として存在する場合
                if (analysis.project_story && typeof analysis.project_story === 'string') {
                  description = analysis.project_story;
                } 
                // key_requirementsが配列として存在する場合
                else if (analysis.key_requirements && Array.isArray(analysis.key_requirements) && analysis.key_requirements.length > 0) {
                  description = analysis.key_requirements.join('\n');
                }
                // それ以外の場合はフォールバック
                else if (analysis.key_requirements && typeof analysis.key_requirements === 'string') {
                  // もしkey_requirementsが文字列の場合
                  description = analysis.key_requirements;
                }
                
                console.log('Setting description to:', description);
                console.log('Description type:', typeof description);
                
                setFormData({
                  title: analysis.key_requirements && Array.isArray(analysis.key_requirements) && analysis.key_requirements.length > 0 
                    ? `${analysis.project_type === 'training' ? 'AI活用支援' : 'AI開発'}プロジェクト`
                    : formData.title,
                  description: description,
                  budget: analysis.estimated_budget_range && typeof analysis.estimated_budget_range === 'object'
                    ? `${(analysis.estimated_budget_range.min / 10000).toFixed(0)}万円〜${(analysis.estimated_budget_range.max / 10000).toFixed(0)}万円`
                    : formData.budget,
                  duration: formData.duration, // これは会話から推定が難しいので保持
                  status: formData.status,
                  // AI要件は完全に上書き
                  required_ai_level: analysis.required_ai_level || '',
                  project_difficulty: analysis.project_difficulty || '',
                });
                // 会話IDを保存
                if (conversationId) {
                  setConversationId(conversationId);
                }
                // 通常のフォームに戻る
                setUseAIWizard(false);
              }}
            />
            <Button
              type="button"
              onClick={() => setUseAIWizard(false)}
              variant="outline"
              className="w-full"
            >
              通常のフォームに戻る
            </Button>
          </div>
        ) : (
        <form onSubmit={(e) => handleSubmit(e, true)} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg">
              {error}
            </div>
          )}

          {/* 基本情報 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">基本情報</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  プロジェクトタイトル <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="title"
                  name="title"
                  required
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="例: ECサイトリニューアルプロジェクト"
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  プロジェクト説明 <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={6}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="プロジェクトの概要、背景、求めるプロフェッショナルの役割などを詳しく記載してください"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
                    予算
                  </label>
                  <input
                    type="text"
                    id="budget"
                    name="budget"
                    value={formData.budget}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="例: 100万円〜200万円"
                  />
                </div>

                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
                    期間
                  </label>
                  <input
                    type="text"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="例: 3ヶ月〜6ヶ月"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI要件 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-500" />
              AI人材要件
            </h2>
            
            <div className="space-y-4">
              {/* 必要なAIレベル */}
              <div>
                <label htmlFor="required_ai_level" className="block text-sm font-medium text-gray-700 mb-1">
                  必要なAIスキルレベル <span className="text-red-500">*</span>
                </label>
                <select
                  id="required_ai_level"
                  name="required_ai_level"
                  required
                  value={formData.required_ai_level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">選択してください</option>
                  <option value="expert">エキスパート - ML/DL開発、研究開発が可能</option>
                  <option value="developer">開発者 - API活用したシステム開発が可能</option>
                  <option value="user">活用者 - ChatGPT等を業務で活用</option>
                  <option value="supporter">支援者 - AI導入のコンサル・教育</option>
                </select>
              </div>

              {/* プロジェクト難易度 */}
              <div>
                <label htmlFor="project_difficulty" className="block text-sm font-medium text-gray-700 mb-1">
                  プロジェクト難易度 <span className="text-red-500">*</span>
                </label>
                <select
                  id="project_difficulty"
                  name="project_difficulty"
                  required
                  value={formData.project_difficulty}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">選択してください</option>
                  <option value="beginner">初級 - 基本的なAI活用</option>
                  <option value="intermediate">中級 - 実践的なAI導入</option>
                  <option value="advanced">上級 - 高度な開発・カスタマイズ</option>
                </select>
              </div>


            </div>
          </div>


          {/* 公開設定 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">公開設定</h2>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                ステータス
              </label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="draft">下書き</option>
                <option value="public">公開</option>
                <option value="private">非公開</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                公開にすると、プロフェッショナルがプロジェクトを検索・閲覧できるようになります
              </p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-between items-center">
            <Link href="/dashboard">
              <Button type="button" variant="ghost">
                キャンセル
              </Button>
            </Link>
            
            <div className="flex gap-2">
              <Button
                type="submit"
                disabled={saving}
                variant="outline"
                className="flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    下書き保存
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                disabled={saving || !formData.title || !formData.description}
                onClick={async (e) => {
                  // formDataを直接更新せず、公開ステータスで保存
                  e.preventDefault();
                  setSaving(true);
                  setError(null);

                  try {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) {
                      router.push("/login");
                      return;
                    }

                    const { data, error: insertError } = await supabase
                      .from("projects")
                      .insert({
                        client_id: user.id,
                        title: formData.title,
                        description: formData.description,
                        budget: formData.budget,
                        duration: formData.duration,
                        status: "public", // 直接publicを指定
                        pro_requirements: {
                          required_ai_level: formData.required_ai_level,
                                        project_difficulty: formData.project_difficulty,
                        },
                      })
                      .select()
                      .single();

                    if (insertError) {
                      throw insertError;
                    }

                    // 会話IDがある場合は、プロジェクトと紐付ける
                    if (conversationId && data.id) {
                      await supabase
                        .from('ai_conversations')
                        .update({
                          project_id: data.id
                        })
                        .eq('id', conversationId);
                    }

                    router.push(`/projects/${data.id}`);
                  } catch (err: any) {
                    console.error("Error creating project:", err);
                    setError(err.message || "プロジェクトの作成に失敗しました");
                  } finally {
                    setSaving(false);
                  }
                }}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                公開して保存
              </Button>
            </div>
          </div>
        </form>
        )}
      </main>
    </div>
  );
}