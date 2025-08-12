"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { createClient } from "../../../utils/supabase/client";
import Link from "next/link";
import LoggedInHeader from "../../../components/LoggedInHeader";
import AIProfileSection from "../../../components/profile/AIProfileSection";
import { ArrowLeft, Save, Loader2, Sparkles, AlertCircle, CheckCircle, TrendingUp, Upload, User, X } from "lucide-react";
import { AISkillType } from "../../../types/ai-talent";
import { useToast } from "../../../components/ui/toast";
import { LoadingPage } from "../../../components/ui/loading";

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
  avatar_url?: string | null;
  profile_details?: any;
  rate_info?: any;
  contact_info?: any;
  availability?: any;
}

export default function ProfileEditPage() {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // フォームの状態
  const [fullName, setFullName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
  const [aiAchievements, setAIAchievements] = useState("");
  const [introduction, setIntroduction] = useState("");
  
  // プロフィール充実度を計算
  const calculateCompleteness = () => {
    let score = 0;
    const weights = {
      basic: 15,        // 基本情報（名前、紹介文）
      aiSkills: 15,     // AIスキルタイプ
      aiTools: 20,      // AIツール（3つ以上で満点）
      aiExperience: 15, // AI経験（年数と領域）
      aiAchievements: 15, // AI実績
      hourlyRate: 10,   // 時間単価
      availability: 10  // 稼働可能状況
    };
    
    // 基本情報
    if (fullName && introduction) {
      score += weights.basic;
    } else if (fullName) {
      score += weights.basic * 0.5;
    }
    
    // AIスキル
    if (aiSkills.length > 0) {
      score += weights.aiSkills;
    }
    
    // AIツール（3つ以上で満点、1-2個で部分点）
    if (aiTools.length >= 3) {
      score += weights.aiTools;
    } else if (aiTools.length > 0) {
      score += weights.aiTools * (aiTools.length / 3);
    }
    
    // AI経験（年数と領域両方あれば満点）
    if (aiExperience.years > 0 && aiExperience.domains.length > 0) {
      score += weights.aiExperience;
    } else if (aiExperience.years > 0) {
      score += weights.aiExperience * 0.5;
    }
    
    // AI実績
    if (aiAchievements.length > 50) {
      score += weights.aiAchievements;
    } else if (aiAchievements) {
      score += weights.aiAchievements * 0.5;
    }
    
    // 時間単価
    if (hourlyRate) {
      score += weights.hourlyRate;
    }
    
    // 稼働可能状況
    if (availability && availability !== 'unavailable') {
      score += weights.availability;
    }
    
    return Math.round(score);
  };
  
  // 未入力項目を取得
  const getMissingItems = () => {
    const missing = [];
    
    if (!fullName) missing.push("名前");
    if (!introduction) missing.push("自己紹介");
    if (aiSkills.length === 0) missing.push("AIスキルレベル");
    if (aiTools.length === 0) missing.push("AIツール");
    if (aiExperience.years === 0) missing.push("AI経験年数");
    if (aiExperience.domains.length === 0) missing.push("活用領域");
    if (!aiAchievements) missing.push("AI活用実績");
    if (!hourlyRate) missing.push("時間単価");
    
    return missing;
  };

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
          setAvatarUrl(profileData.avatar_url || null);
          setIntroduction(profileData.profile_details?.introduction || "");
          setPortfolio(profileData.profile_details?.portfolio_url || "");
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
          setAIAchievements(profileData.profile_details?.ai_achievements || "");
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [router, supabase]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ファイルサイズチェック（5MBまで）
    if (file.size > 5 * 1024 * 1024) {
      addToast({
        type: "error",
        message: "画像サイズは5MB以下にしてください",
      });
      return;
    }

    // ファイルタイプチェック
    if (!file.type.startsWith('image/')) {
      addToast({
        type: "error",
        message: "画像ファイルを選択してください",
      });
      return;
    }

    setAvatarFile(file);
    
    // プレビュー表示
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile || !profile) return avatarUrl;
    
    setUploadingAvatar(true);
    try {
      const fileExt = avatarFile.name.split('.').pop();
      const fileName = `${profile.id}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // 古いアバターを削除
      if (profile.avatar_url) {
        const oldPath = profile.avatar_url.split('/').pop();
        if (oldPath) {
          await supabase.storage
            .from('avatars')
            .remove([`avatars/${oldPath}`]);
        }
      }

      // 新しいアバターをアップロード
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Avatar upload error:', error);
      addToast({
        type: "error",
        message: "アバターのアップロードに失敗しました",
      });
      return null;
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profile) return;
    
    setSaving(true);
    
    try {
      // アバターをアップロード（変更があれば）
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        const uploadedUrl = await uploadAvatar();
        if (uploadedUrl) {
          finalAvatarUrl = uploadedUrl;
        }
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          avatar_url: finalAvatarUrl,
          profile_details: {
            // 基本情報
            introduction: introduction,
            // AI関連フィールド
            ai_skills: aiSkills,
            ai_tools: aiTools,
            ai_experience: aiExperience,
            ai_achievements: aiAchievements,
            portfolio_url: portfolio,
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
        addToast({
          type: "error",
          message: "プロフィールの更新に失敗しました",
        });
      } else {
        addToast({
          type: "success",
          message: "プロフィールを更新しました",
        });
        setTimeout(() => {
          router.push("/dashboard");
        }, 1000);
      }
    } catch (error) {
      console.error("Error:", error);
      addToast({
        type: "error",
        message: "エラーが発生しました。もう一度お試しください。",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingPage />;
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
        
        {/* プロフィール充実度ガイド（プロフェッショナルのみ） */}
        {profile.user_type === "pro" && (
          <div className="mb-6 bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg shadow-sm border border-purple-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                プロフィール充実度
              </h2>
              <div className="text-right">
                <span className={`text-2xl font-bold ${
                  calculateCompleteness() >= 80 ? 'text-green-600' : 
                  calculateCompleteness() >= 60 ? 'text-blue-600' : 
                  'text-orange-600'
                }`}>
                  {calculateCompleteness()}%
                </span>
                <p className="text-xs text-gray-600 mt-1">
                  {calculateCompleteness() >= 80 ? '優秀' : 
                   calculateCompleteness() >= 60 ? '良好' : '改善が必要'}
                </p>
              </div>
            </div>
            
            <div className="w-full bg-white rounded-full h-3 mb-4 overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  calculateCompleteness() >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                  calculateCompleteness() >= 60 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                  'bg-gradient-to-r from-orange-400 to-orange-600'
                }`}
                style={{ width: `${calculateCompleteness()}%` }}
              />
            </div>
            
            {/* 進捗インジケーター */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className={`text-center p-2 rounded-lg ${
                fullName && introduction ? 'bg-green-100' : fullName ? 'bg-yellow-100' : 'bg-gray-100'
              }`}>
                <p className="text-xs text-gray-600">基本情報</p>
                <p className={`text-sm font-medium ${
                  fullName && introduction ? 'text-green-700' : fullName ? 'text-yellow-700' : 'text-gray-500'
                }`}>
                  {fullName && introduction ? '完了' : fullName ? '一部' : '未入力'}
                </p>
              </div>
              <div className={`text-center p-2 rounded-lg ${
                aiSkills.length > 0 && aiTools.length >= 3 ? 'bg-green-100' : 
                aiSkills.length > 0 || aiTools.length > 0 ? 'bg-yellow-100' : 'bg-gray-100'
              }`}>
                <p className="text-xs text-gray-600">AIスキル</p>
                <p className={`text-sm font-medium ${
                  aiSkills.length > 0 && aiTools.length >= 3 ? 'text-green-700' : 
                  aiSkills.length > 0 || aiTools.length > 0 ? 'text-yellow-700' : 'text-gray-500'
                }`}>
                  {aiSkills.length > 0 && aiTools.length >= 3 ? '完了' : 
                   aiSkills.length > 0 || aiTools.length > 0 ? '一部' : '未入力'}
                </p>
              </div>
              <div className={`text-center p-2 rounded-lg ${
                aiExperience.years > 0 && aiExperience.domains.length > 0 ? 'bg-green-100' : 
                aiExperience.years > 0 ? 'bg-yellow-100' : 'bg-gray-100'
              }`}>
                <p className="text-xs text-gray-600">経験</p>
                <p className={`text-sm font-medium ${
                  aiExperience.years > 0 && aiExperience.domains.length > 0 ? 'text-green-700' : 
                  aiExperience.years > 0 ? 'text-yellow-700' : 'text-gray-500'
                }`}>
                  {aiExperience.years > 0 && aiExperience.domains.length > 0 ? '完了' : 
                   aiExperience.years > 0 ? '一部' : '未入力'}
                </p>
              </div>
              <div className={`text-center p-2 rounded-lg ${
                aiAchievements && hourlyRate ? 'bg-green-100' : 
                aiAchievements || hourlyRate ? 'bg-yellow-100' : 'bg-gray-100'
              }`}>
                <p className="text-xs text-gray-600">実績・単価</p>
                <p className={`text-sm font-medium ${
                  aiAchievements && hourlyRate ? 'text-green-700' : 
                  aiAchievements || hourlyRate ? 'text-yellow-700' : 'text-gray-500'
                }`}>
                  {aiAchievements && hourlyRate ? '完了' : 
                   aiAchievements || hourlyRate ? '一部' : '未入力'}
                </p>
              </div>
            </div>
            
            {/* ステータスメッセージ */}
            {calculateCompleteness() === 100 ? (
              <div className="flex items-center gap-2 p-3 bg-green-100 rounded-lg border border-green-200">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-green-800">プロフィール完璧です！</p>
                  <p className="text-xs text-green-700 mt-0.5">最高のマッチング率でプロジェクトが見つかります</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200">
                  <TrendingUp className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">
                      あと{getMissingItems().length}項目でプロフィール完成
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      未入力: {getMissingItems().slice(0, 3).join('、')}
                      {getMissingItems().length > 3 && `他${getMissingItems().length - 3}項目`}
                    </p>
                  </div>
                </div>
                
                {/* 主要な改善提案 */}
                {aiTools.length < 3 && (
                  <div className="flex items-start gap-2 p-2 bg-orange-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-orange-700">
                      AIツールを{3 - aiTools.length}つ追加するとマッチング率が大幅に向上します
                    </p>
                  </div>
                )}
                {!introduction && (
                  <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700">
                      自己紹介を追加するとクライアントからの信頼度が上がります
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本情報 */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold mb-4">基本情報</h2>
            
            <div className="space-y-4">
              {/* アバター */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  プロフィール画像
                </label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {avatarUrl ? (
                        <img 
                          src={avatarUrl} 
                          alt="Avatar" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-12 h-12 text-gray-400" />
                      )}
                    </div>
                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl(null);
                          setAvatarFile(null);
                        }}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="flex items-center gap-2"
                    >
                      {uploadingAvatar ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          アップロード中...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4" />
                          画像を選択
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-gray-500 mt-1">
                      JPG、PNG（最大5MB）
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  氏名 <span className="text-red-500">*</span>
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
              
              {profile.user_type === "pro" && (
                <div>
                  <label htmlFor="introduction" className="block text-sm font-medium text-gray-700 mb-1">
                    自己紹介
                    {!introduction && (
                      <span className="text-xs text-orange-600 ml-2">（未入力 - マッチング率に影響します）</span>
                    )}
                  </label>
                  <textarea
                    id="introduction"
                    value={introduction}
                    onChange={(e) => setIntroduction(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="あなたの経験、スキル、専門分野について簡潔に説明してください"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    クライアントが最初に見る重要な情報です。具体的な経験や実績を含めると信頼度が上がります。
                  </p>
                </div>
              )}
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
              aiAchievements={aiAchievements}
              portfolioUrl={portfolio}
              onAISkillsChange={setAISkills}
              onAIToolsChange={setAITools}
              onAIExperienceChange={setAIExperience}
              onAIAchievementsChange={setAIAchievements}
              onPortfolioUrlChange={setPortfolio}
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