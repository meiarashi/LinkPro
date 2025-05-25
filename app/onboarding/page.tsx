export const dynamic = 'force-dynamic';

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "../../components/ui/button";
import Link from "next/link";

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded, isSignedIn } = useUser();
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // フォームの状態
  const [formData, setFormData] = useState({
    // 共通フィールド
    displayName: "",
    bio: "",
    
    // クライアント向けフィールド
    companyName: "",
    position: "",
    
    // PM向けフィールド
    skills: "",
    experience: "",
    rate: "",
  });

  useEffect(() => {
    // URLパラメータからユーザータイプを取得
    const typeFromUrl = searchParams.get("type");
    
    if (typeFromUrl && (typeFromUrl === "client" || typeFromUrl === "pm")) {
      setUserType(typeFromUrl);
    } else {
      // URLに指定がなければローカルストレージから取得
      const storedType = localStorage.getItem("userType");
      if (storedType && (storedType === "client" || storedType === "pm")) {
        setUserType(storedType);
      }
    }
    
    // ユーザーがログインしていない場合はログインページにリダイレクト
    if (isLoaded && !isSignedIn) {
      router.push("/login");
    }

    // ユーザー情報が読み込まれたら、初期値を設定
    if (isLoaded && isSignedIn && user) {
      setFormData(prev => ({
        ...prev,
        displayName: user.firstName ? `${user.firstName} ${user.lastName || ""}` : ""
      }));
    }
  }, [isLoaded, isSignedIn, user, router, searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // TODO: ここでSupabaseなどにユーザー情報を保存する処理を実装
      // 例: await saveUserProfile(user.id, { ...formData, userType });
      
      // 保存が成功したらダッシュボードにリダイレクト
      router.push("/dashboard");
    } catch (error) {
      console.error("プロフィールの保存に失敗しました", error);
      setLoading(false);
    }
  };

  if (!isLoaded || !userType) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">
            プロフィール設定
          </h1>
          <p className="mt-2 text-gray-600">
            {userType === "client" 
              ? "クライアントとして必要な情報を入力してください" 
              : "PMとして必要な情報を入力してください"}
          </p>
        </div>

        <div className="bg-white shadow rounded-lg overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* 共通フィールド */}
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                表示名
              </label>
              <input
                type="text"
                id="displayName"
                name="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                自己紹介
              </label>
              <textarea
                id="bio"
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                rows={4}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              />
            </div>

            {/* クライアント向けフィールド */}
            {userType === "client" && (
              <>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                    会社名
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                    役職
                  </label>
                  <input
                    type="text"
                    id="position"
                    name="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
              </>
            )}

            {/* PM向けフィールド */}
            {userType === "pm" && (
              <>
                <div>
                  <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
                    スキル（カンマ区切りで入力）
                  </label>
                  <input
                    type="text"
                    id="skills"
                    name="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    placeholder="例: プロジェクト管理, アジャイル, Jira"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
                    経験年数
                  </label>
                  <input
                    type="text"
                    id="experience"
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    placeholder="例: 5年"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>

                <div>
                  <label htmlFor="rate" className="block text-sm font-medium text-gray-700">
                    希望単価（月額）
                  </label>
                  <input
                    type="text"
                    id="rate"
                    name="rate"
                    value={formData.rate}
                    onChange={handleChange}
                    placeholder="例: 100万円〜"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                  />
                </div>
              </>
            )}

            <div className="flex justify-between pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/")}
                disabled={loading}
              >
                キャンセル
              </Button>
              <Button
                type="submit"
                disabled={loading}
              >
                {loading ? "保存中..." : "保存して続ける"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 