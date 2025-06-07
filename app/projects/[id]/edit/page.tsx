"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../../components/ui/button";
import { createClient } from "../../../../utils/supabase/client";
import Link from "next/link";
import { ArrowLeft, Save, Eye, Trash2 } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string | null;
  budget: string | null;
  duration: string | null;
  required_skills: string[];
  status: 'draft' | 'public' | 'private' | 'completed' | 'cancelled';
  client_id: string;
}

export default function EditProjectPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    duration: "",
    required_skills: [] as string[],
    status: "draft" as "draft" | "public" | "private" | "completed" | "cancelled",
  });
  
  const [skillInput, setSkillInput] = useState("");

  useEffect(() => {
    fetchProject();
  }, [params.id]);

  const fetchProject = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: project, error: fetchError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", params.id)
        .single();

      if (fetchError || !project) {
        console.error("Error fetching project:", fetchError);
        router.push("/dashboard");
        return;
      }

      // プロジェクトオーナーでない場合はダッシュボードへリダイレクト
      if (project.client_id !== user.id) {
        router.push("/dashboard");
        return;
      }

      // フォームデータを設定
      setFormData({
        title: project.title || "",
        description: project.description || "",
        budget: project.budget || "",
        duration: project.duration || "",
        required_skills: project.required_skills || [],
        status: project.status,
      });
    } catch (err) {
      console.error("Error:", err);
      router.push("/dashboard");
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

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.required_skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        required_skills: [...prev.required_skills, skillInput.trim()]
      }));
      setSkillInput("");
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      required_skills: prev.required_skills.filter(skill => skill !== skillToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent, newStatus?: string) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const updateData = {
        title: formData.title,
        description: formData.description,
        budget: formData.budget,
        duration: formData.duration,
        required_skills: formData.required_skills,
        status: newStatus || formData.status,
      };

      const { error: updateError } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", params.id);

      if (updateError) {
        throw updateError;
      }

      router.push(`/projects/${params.id}`);
    } catch (err: any) {
      console.error("Error updating project:", err);
      setError(err.message || "プロジェクトの更新に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const { error: deleteError } = await supabase
        .from("projects")
        .delete()
        .eq("id", params.id);

      if (deleteError) {
        throw deleteError;
      }

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Error deleting project:", err);
      setError(err.message || "プロジェクトの削除に失敗しました");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/projects/${params.id}`}>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  戻る
                </Button>
              </Link>
              <h1 className="text-xl font-bold">プロジェクト編集</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-8 max-w-4xl">
        <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
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
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 求めるスキル */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">求めるスキル</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="skill" className="block text-sm font-medium text-gray-700 mb-1">
                  必要なスキルを追加
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    id="skill"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSkill();
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="例: プロジェクトマネジメント"
                  />
                  <Button
                    type="button"
                    onClick={handleAddSkill}
                    variant="outline"
                  >
                    追加
                  </Button>
                </div>
              </div>

              {formData.required_skills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.required_skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="ml-1 text-blue-500 hover:text-blue-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
                <option value="completed">完了</option>
                <option value="cancelled">中止</option>
              </select>
              <p className="text-sm text-gray-500 mt-1">
                公開にすると、PMがプロジェクトを検索・閲覧できるようになります
              </p>
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                削除
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Link href={`/projects/${params.id}`}>
                <Button type="button" variant="ghost">
                  キャンセル
                </Button>
              </Link>
              
              <Button
                type="submit"
                disabled={saving || !formData.title || !formData.description}
                className="flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存
              </Button>
              
              {formData.status !== 'public' && (
                <Button
                  type="button"
                  disabled={saving || !formData.title || !formData.description}
                  onClick={(e) => handleSubmit(e, 'public')}
                  className="flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  公開して保存
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* 削除確認モーダル */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">プロジェクトを削除しますか？</h3>
              <p className="text-gray-600 mb-6">
                この操作は取り消すことができません。プロジェクトと関連する全ての応募データが削除されます。
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  キャンセル
                </Button>
                <Button
                  onClick={handleDelete}
                  disabled={saving}
                  className="bg-red-600 hover:bg-red-700"
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