"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "../../components/ui/button";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";
import { User } from "@supabase/supabase-js";

export default function OnboardingClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    displayName: "",
    bio: "",
    companyName: "",
    position: "",
    skills: "",
    experience: "",
    rate: "",
  });

  useEffect(() => {
    const typeFromUrl = searchParams.get("type");
    if (typeFromUrl && (typeFromUrl === "client" || typeFromUrl === "pro")) {
      setUserType(typeFromUrl);
    } else {
      const storedType = localStorage.getItem("userType");
      if (storedType && (storedType === "client" || storedType === "pro")) {
        setUserType(storedType);
      }
    }

    const getUserData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      setLoading(false);

      if (!currentUser) {
        router.push("/login");
        return;
      }

      if (currentUser) {
        setFormData(prev => ({
          ...prev,
          displayName: currentUser.email || ""
        }));
      }
    };

    getUserData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router, searchParams, supabase]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);

    // Prepare data for auth.users update (keeping existing logic)
    const userUpdateData: any = {
      user_type: userType,
      full_name: formData.displayName,
      bio: formData.bio,
      company_name: userType === "client" ? formData.companyName : undefined,
      position: userType === "client" ? formData.position : undefined,
      skills: userType === "pro" ? formData.skills.split(',').map(s => s.trim()).filter(s => s) : undefined,
      experience_years: userType === "pro" ? (parseInt(formData.experience) || 0) : undefined,
      hourly_rate: userType === "pro" ? (parseInt(formData.rate) || 0) : undefined,
    };

    // Prepare data for profiles table upsert
    const profileData: any = {
      id: user.id, // profilesテーブルのidはauth.users.idと同じ
      user_type: userType,
      full_name: formData.displayName,
      profile_details: {
        bio: formData.bio,
        company_name: userType === "client" ? formData.companyName : undefined,
        position: userType === "client" ? formData.position : undefined,
        skills: userType === "pro" ? formData.skills.split(',').map(s => s.trim()).filter(s => s) : undefined,
        experience_years: userType === "pro" ? (parseInt(formData.experience) || 0) : undefined,
      },
      rate_info: userType === "pro" ? {
        hourly_rate: parseInt(formData.rate) || 0
      } : {},
      availability: {}, // 後で拡張可能
      contact_info: {}, // 後で拡張可能
      visibility: true,
    };

    // First, update the auth.users table (or user metadata)
    const { data: updatedUser, error: updateUserError } = await supabase.auth.updateUser({
        data: userUpdateData
    });

    if (updateUserError) {
      setSaving(false);
      alert("ユーザー情報の更新に失敗しました: " + updateUserError.message);
      return;
    }

    // Next, upsert into the profiles table
    // profilesテーブルのスキーマに合わせて調整してください。
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(profileData, { onConflict: 'id' }); // 'id' をコンフリクトターゲットとして指定

    setSaving(false);

    if (profileError) {
      alert("プロフィールの保存に失敗しました: " + profileError.message);
      // updateUserは成功したがprofileの保存に失敗した場合のロールバック処理を検討することもできます
    } else {
      alert("プロフィールを保存しました！");
      localStorage.setItem("userType", userType || "");
      // プロフィール編集画面に遷移して詳細情報を入力
      router.push("/profile/edit");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <p>ユーザー情報を読み込んでいます...</p>
        </div>
    );
  }
  
  if (!userType) {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <p className="text-red-500 mb-4">ユーザータイプが不明です。サインアップページからやり直してください。</p>
            <Link href="/signup">
                <Button variant="outline">サインアップページへ</Button>
            </Link>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          <div className="bg-primary px-6 py-8 text-white">
            <h1 className="text-3xl font-bold">
              {userType === "client" ? "クライアント情報入力" : "プロフェッショナル情報入力"}
            </h1>
            <p className="mt-2 opacity-90">
              ようこそ、{formData.displayName || user.email}さん！<br />
              プロジェクトを開始するために、以下の情報を入力してください。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                表示名
              </label>
              <input
                type="text"
                name="displayName"
                id="displayName"
                value={formData.displayName}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                自己紹介
              </label>
              <textarea
                name="bio"
                id="bio"
                rows={3}
                value={formData.bio}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                placeholder={userType === "client" ? "どのようなプロジェクトを依頼したいか、会社の簡単な紹介など" : "あなたのスキル、経験、得意なプロジェクト分野など"}
              />
            </div>

            {userType === "client" && (
              <>
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                    会社名
                  </label>
                  <input
                    type="text"
                    name="companyName"
                    id="companyName"
                    value={formData.companyName}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="position" className="block text-sm font-medium text-gray-700">
                    役職・担当
                  </label>
                  <input
                    type="text"
                    name="position"
                    id="position"
                    value={formData.position}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </>
            )}

            {userType === "pro" && (
              <>
                <div>
                  <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
                    スキル (カンマ区切り 例: React, Node.js, AWS)
                  </label>
                  <input
                    type="text"
                    name="skills"
                    id="skills"
                    value={formData.skills}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
                    プロフェッショナル経験年数 (数字のみ)
                  </label>
                  <input
                    type="number"
                    name="experience"
                    id="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="rate" className="block text-sm font-medium text-gray-700">
                    希望時間単価 (円、数字のみ)
                  </label>
                  <input
                    type="number"
                    name="rate"
                    id="rate"
                    value={formData.rate}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </>
            )}

            <div className="pt-5">
              <div className="flex justify-end space-x-3">
                <Link href="/dashboard">
                    <Button type="button" variant="outline">
                        後で設定する
                    </Button>
                </Link>
                <Button type="submit" disabled={saving || loading}>
                  {saving ? "保存中..." : "プロフィールを保存して開始"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 