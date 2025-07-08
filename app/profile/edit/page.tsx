"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { createClient } from "../../../utils/supabase/client";
import Link from "next/link";
import LoggedInHeader from "../../../components/LoggedInHeader";
import AIProfileSection from "../../../components/profile/AIProfileSection";
import AIUseCaseSection from "../../../components/profile/AIUseCaseSection";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { AISkillType } from "../../../types/ai-talent";

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
  profile_details?: any;
  rate_info?: any;
  contact_info?: any;
  availability?: any;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // フォームの状態
  const [fullName, setFullName] = useState("");
  const [skills, setSkills] = useState("");
  const [experience, setExperience] = useState("");
  const [portfolio, setPortfolio] = useState("");
  const [hourlyRate, setHourlyRate] = useState("");
  const [availability, setAvailability] = useState("full-time");
  
  // AI関連の状態
  const [aiSkills, setAISkills] = useState<AISkillType[]>([]);
  const [aiTools, setAITools] = useState<string[]>([]);
  const [aiExperience, setAIExperience] = useState({
    years: 0,
    domains: [] as string[],
    achievements: [] as string[],
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push("/login");
          return;
        }

        const { data: profileData, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile:", error);
        } else if (profileData) {
          setProfile(profileData);
          
          // フォームにデータをセット
          setFullName(profileData.full_name || "");
          setSkills(profileData.profile_details?.skills || "");
          setExperience(profileData.profile_details?.experience || "");
          setPortfolio(profileData.profile_details?.portfolio || "");
          setHourlyRate(profileData.rate_info?.hourly_rate || "");
          setAvailability(profileData.availability?.status || "full-time");
          
          // AI関連データをセット
          setAISkills(profileData.profile_details?.ai_skills || []);
          setAITools(profileData.profile_details?.ai_tools || []);
          setAIExperience(profileData.profile_details?.ai_experience || {
            years: 0,
            domains: [],
            achievements: [],
          });
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;
    
    setSaving(true);
    
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          profile_details: {
            skills,
            experience,
            portfolio,
            // AI関連フィールド
            ai_skills: aiSkills,
            ai_tools: aiTools,
            ai_experience: aiExperience,
          },
          rate_info: {
            hourly_rate: hourlyRate,
          },
          availability: {
            status: availability,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) {
        console.error("Error updating profile:", error);
        alert("プロフィールの更新に失敗しました");
      } else {
        alert("プロフィールを更新しました");
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("エラーが発生しました");
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

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>プロフィール情報が見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <LoggedInHeader userProfile={profile} />

      {/* メインコンテンツ */}
      <main className="container mx-auto p-4 md:p-8 max-w-4xl">
        {/* ページタイトル */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">プロフィール編集</h1>
          <p className="mt-2 text-gray-600">あなたの情報を最新に保ちましょう</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">基本情報</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  氏名
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
            </div>
          </div>

          {/* プロフィール詳細 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">プロフィール詳細</h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="skills" className="block text-sm font-medium text-gray-700 mb-1">
                  スキル・専門分野
                </label>
                <textarea
                  id="skills"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="例: プロジェクト管理、アジャイル開発、スクラムマスター"
                />
              </div>

              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-1">
                  経歴・実績
                </label>
                <textarea
                  id="experience"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="これまでの経験や実績を記入してください"
                />
              </div>

              <div>
                <label htmlFor="portfolio" className="block text-sm font-medium text-gray-700 mb-1">
                  ポートフォリオURL
                </label>
                <input
                  id="portfolio"
                  type="url"
                  value={portfolio}
                  onChange={(e) => setPortfolio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* AI人材情報（プロフェッショナルのみ） */}
          {profile.user_type === "pro" && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4">詳細情報</h2>
              <AIProfileSection
              aiSkills={aiSkills}
              aiTools={aiTools}
              aiExperience={aiExperience}
              onAISkillsChange={setAISkills}
              onAIToolsChange={setAITools}
              onAIExperienceChange={setAIExperience}
            />
            </div>
          )}

          {/* 単価・稼働情報（プロフェッショナルのみ） */}
          {profile.user_type === "pro" && (
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold mb-4">単価・稼働情報</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="hourlyRate" className="block text-sm font-medium text-gray-700 mb-1">
                    時間単価（円）
                  </label>
                  <input
                    id="hourlyRate"
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="5000"
                  />
                </div>

                <div>
                  <label htmlFor="availability" className="block text-sm font-medium text-gray-700 mb-1">
                    稼働可能状況
                  </label>
                  <select
                    id="availability"
                    value={availability}
                    onChange={(e) => setAvailability(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="full-time">フルタイム可能</option>
                    <option value="part-time">パートタイム可能</option>
                    <option value="busy">現在忙しい</option>
                    <option value="not-available">受付停止中</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* AI活用事例（プロフェッショナルのみ） */}
          {profile.user_type === "pro" && (
            <AIUseCaseSection userId={profile.id} />
          )}

          {/* 送信ボタン */}
          <div className="flex justify-end gap-4">
            <Link href="/dashboard">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  保存
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}