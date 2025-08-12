"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../../components/ui/button";
import { createClient } from "../../../../utils/supabase/client";
import LoggedInHeader from "../../../../components/LoggedInHeader";
import { Loader2, ArrowLeft, Save, Trash2, AlertCircle, Info } from "lucide-react";
import { LoadingPage } from "../../../../components/ui/loading";

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
}

interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string;
  budget: string;
  duration: string;
  status: 'draft' | 'recruiting' | 'contracted' | 'in_progress' | 'in_review' | 'completed' | 'cancelled';
}

export default function EditProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [user, setUser] = useState<any>(null);
  
  // フォームの状態
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [duration, setDuration] = useState("");
  const [status, setStatus] = useState<Project['status']>("recruiting");
  
  // UI状態
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadProjectData();
  }, [params.id]);

  const loadProjectData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        router.push("/login");
        return;
      }
      
      setUser(currentUser);

      // プロフィール情報を取得
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (profileError || !profileData) {
        console.error("Error fetching profile:", profileError);
        router.push("/dashboard");
        return;
      }

      // クライアントかチェック
      if (profileData.user_type !== 'client') {
        router.push("/dashboard");
        return;
      }

      setUserProfile(profileData);

      // プロジェクト情報を取得
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", params.id)
        .eq("client_id", currentUser.id)
        .single();

      if (projectError || !projectData) {
        console.error("Error fetching project:", projectError);
        setMessage({ type: 'error', text: 'プロジェクトが見つかりません' });
        setTimeout(() => router.push("/dashboard"), 2000);
        return;
      }

      setProject(projectData);
      
      // フォームに値を設定
      setTitle(projectData.title);
      setDescription(projectData.description || "");
      setBudget(projectData.budget || "");
      setDuration(projectData.duration || "");
      setStatus(projectData.status);
    } catch (error) {
      console.error("Error:", error);
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const updatedProject = {
        title,
        description,
        budget,
        duration,
        status,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("projects")
        .update(updatedProject)
        .eq("id", params.id)
        .eq("client_id", user.id);

      if (error) {
        setMessage({ type: 'error', text: 'プロジェクトの更新に失敗しました' });
      } else {
        setMessage({ type: 'success', text: 'プロジェクトを更新しました' });
        setTimeout(() => router.push(`/projects/${params.id}`), 1500);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", params.id)
        .eq("client_id", user.id);

      if (error) {
        setMessage({ type: 'error', text: 'プロジェクトの削除に失敗しました' });
      } else {
        setMessage({ type: 'success', text: 'プロジェクトを削除しました' });
        setTimeout(() => router.push("/dashboard"), 1500);
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'エラーが発生しました' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (!userProfile || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>プロジェクト情報が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LoggedInHeader userProfile={userProfile} userEmail={user?.email} />

      <main className="container mx-auto p-4 md:p-8 max-w-4xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push(`/projects/${params.id}`)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            プロジェクト詳細に戻る
          </Button>
          
          <h1 className="text-2xl font-bold text-gray-900">プロジェクトを編集</h1>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-md flex items-center gap-2 ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            <AlertCircle className="w-5 h-5" />
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-sm space-y-6">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              プロジェクトタイトル <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              プロジェクト詳細
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="プロジェクトの詳細な説明を入力してください"
            />
          </div>

          <div>
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-1">
              予算
            </label>
            <input
              id="budget"
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="例: 50万円〜100万円"
            />
          </div>

          <div>
            <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-1">
              期間
            </label>
            <input
              id="duration"
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="例: 3ヶ月"
            />
          </div>


          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
              ステータス
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as Project['status'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              disabled={['completed', 'cancelled'].includes(project.status)}
            >
              {/* 現在のステータスに応じて選択可能なオプションを動的に生成 */}
              {project.status === 'draft' && (
                <>
                  <option value="draft">📝 下書き</option>
                  <option value="recruiting">📢 募集中</option>
                  <option value="cancelled">❌ キャンセル</option>
                </>
              )}
              {project.status === 'recruiting' && (
                <>
                  <option value="recruiting">📢 募集中</option>
                  <option value="draft">📝 下書き（非公開に戻す）</option>
                  <option value="contracted">🤝 契約済</option>
                  <option value="cancelled">❌ キャンセル</option>
                </>
              )}
              {project.status === 'contracted' && (
                <>
                  <option value="contracted">🤝 契約済</option>
                  <option value="in_progress">🚀 進行中</option>
                  <option value="cancelled">❌ キャンセル</option>
                </>
              )}
              {project.status === 'in_progress' && (
                <>
                  <option value="in_progress">🚀 進行中</option>
                  <option value="in_review">👀 確認中</option>
                  <option value="cancelled">❌ キャンセル</option>
                </>
              )}
              {project.status === 'in_review' && (
                <>
                  <option value="in_review">👀 確認中</option>
                  <option value="completed">✅ 完了</option>
                  <option value="in_progress">🚀 進行中（修正のため）</option>
                  <option value="cancelled">❌ キャンセル</option>
                </>
              )}
              {project.status === 'completed' && (
                <option value="completed">✅ 完了（変更不可）</option>
              )}
              {project.status === 'cancelled' && (
                <option value="cancelled">❌ キャンセル（変更不可）</option>
              )}
            </select>
            {['completed', 'cancelled'].includes(project.status) && (
              <p className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                <Info className="w-3 h-3" />
                最終ステータスのため変更できません
              </p>
            )}
          </div>

          <div className="flex justify-between items-center pt-4">
            <Button
              type="button"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              削除
            </Button>
            
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  変更を保存
                </>
              )}
            </Button>
          </div>
        </form>

        {/* 削除確認ダイアログ */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">プロジェクトを削除しますか？</h3>
              <p className="text-gray-600 mb-6">
                この操作は取り消すことができません。関連する応募やメッセージも削除されます。
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={saving}
                >
                  キャンセル
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    handleDelete();
                  }}
                  disabled={saving}
                >
                  削除する
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}