"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { createClient } from "../../../utils/supabase/client";
import LoggedInHeader from "../../../components/LoggedInHeader";
import Link from "next/link";
import { ArrowLeft, Save, Eye, Loader2 } from "lucide-react";

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
}

export default function NewProjectPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    budget: "",
    duration: "",
    required_skills: [] as string[],
    status: "draft" as "draft" | "public" | "private",
  });
  
  const [skillInput, setSkillInput] = useState("");

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

  const handleSubmit = async (e: React.FormEvent, isDraft: boolean = true) => {
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
          required_skills: formData.required_skills,
          status: isDraft ? "draft" : formData.status,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      router.push(`/projects/${data.id}`);
    } catch (err: any) {
      console.error("Error creating project:", err);
      setError(err.message || "プロジェクトの作成に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
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
        
        <h1 className="text-2xl font-bold text-gray-900 mb-6">新規プロジェクト作成</h1>
        
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
                        required_skills: formData.required_skills,
                        status: "public", // 直接publicを指定
                      })
                      .select()
                      .single();

                    if (insertError) {
                      throw insertError;
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
      </main>
    </div>
  );
}