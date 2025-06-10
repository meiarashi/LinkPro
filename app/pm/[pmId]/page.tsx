"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "../../../components/ui/button";
import { Card } from "../../../components/ui/card";
import { createClient } from "../../../utils/supabase/client";
import LoggedInHeader from "../../../components/LoggedInHeader";
import { 
  User, 
  ArrowLeft, 
  MessageSquare, 
  Clock, 
  Briefcase,
  Star,
  Globe,
  Mail,
  Loader2 
} from "lucide-react";

interface PMProfile {
  id: string;
  full_name: string | null;
  profile_details: {
    skills?: string[];
    experience?: string;
    portfolio?: string;
    introduction?: string;
    achievements?: string;
  } | null;
  rate_info: {
    hourly_rate?: string;
    project_rate?: string;
  } | null;
  availability?: {
    status?: string;
    hours_per_week?: number;
  } | null;
  contact_info?: {
    website?: string;
    linkedin?: string;
  } | null;
}

export default function PMDetailPage({ 
  params 
}: { 
  params: { pmId: string } 
}) {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [pmProfile, setPmProfile] = useState<PMProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);
  const [userProjects, setUserProjects] = useState<any[]>([]);

  useEffect(() => {
    loadPmProfile();
  }, [params.pmId]);

  const loadPmProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setCurrentUser(user);

      // ユーザープロフィールを確認（クライアントのみアクセス可能）
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (userProfile?.user_type !== 'client') {
        router.push("/dashboard");
        return;
      }

      setCurrentUserProfile(userProfile);

      // PMプロフィールを取得
      const { data: pm, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", params.pmId)
        .eq("user_type", "pm")
        .eq("visibility", true)
        .single();

      if (error || !pm) {
        console.error("Error fetching PM:", error);
        router.push("/pm-list");
        return;
      }

      setPmProfile(pm);

      // クライアントのプロジェクトを取得
      const { data: projects } = await supabase
        .from("projects")
        .select("id, title")
        .eq("client_id", user.id)
        .eq("status", "public");

      if (projects) {
        setUserProjects(projects);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartConversation = () => {
    if (userProjects.length === 0) {
      alert("スカウトするには、まず公開中のプロジェクトが必要です。");
      return;
    }
    // PM一覧ページのスカウト機能を使う
    router.push("/pm-list");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!pmProfile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {currentUserProfile && (
        <LoggedInHeader 
          userProfile={currentUserProfile} 
          userEmail={currentUser?.email}
        />
      )}
      
      <main className="container mx-auto px-4 py-8">
        {/* 戻るボタン */}
        <Link href="/pm-list">
          <Button variant="ghost" className="mb-6 flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            PM一覧に戻る
          </Button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 左側: プロフィール情報 */}
          <div className="lg:col-span-2 space-y-6">
            {/* 基本情報 */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-10 h-10 text-gray-500" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{pmProfile.full_name || '名前未設定'}</h1>
                    <p className="text-gray-600">プロジェクトマネージャー</p>
                  </div>
                </div>
              </div>

              {/* 自己紹介 */}
              {pmProfile.profile_details?.introduction && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">自己紹介</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {pmProfile.profile_details.introduction}
                  </p>
                </div>
              )}

              {/* スキル */}
              {pmProfile.profile_details?.skills && pmProfile.profile_details.skills.length > 0 && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-3">スキル</h3>
                  <div className="flex flex-wrap gap-2">
                    {pmProfile.profile_details.skills.map((skill, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 経験・実績 */}
              {pmProfile.profile_details?.experience && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">経験・実績</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {pmProfile.profile_details.experience}
                  </p>
                </div>
              )}

              {/* ポートフォリオ */}
              {pmProfile.profile_details?.portfolio && (
                <div>
                  <h3 className="font-semibold mb-2">ポートフォリオ</h3>
                  <a 
                    href={pmProfile.profile_details.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1"
                  >
                    <Globe className="w-4 h-4" />
                    {pmProfile.profile_details.portfolio}
                  </a>
                </div>
              )}
            </Card>
          </div>

          {/* 右側: アクション・料金情報 */}
          <div className="space-y-6">
            {/* アクションボタン */}
            <Card className="p-6">
              <Button 
                className="w-full mb-3"
                size="lg"
                onClick={handleStartConversation}
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                スカウトメッセージを送る
              </Button>
              <p className="text-sm text-gray-600 text-center">
                プロジェクトを選択してメッセージを送信できます
              </p>
            </Card>

            {/* 料金情報 */}
            {pmProfile.rate_info && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">料金</h3>
                {pmProfile.rate_info.hourly_rate && (
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-gray-600">時間単価</span>
                    <span className="font-semibold text-lg">
                      ¥{pmProfile.rate_info.hourly_rate}/時間
                    </span>
                  </div>
                )}
                {pmProfile.rate_info.project_rate && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">プロジェクト単価</span>
                    <span className="font-semibold text-lg">
                      ¥{pmProfile.rate_info.project_rate}〜
                    </span>
                  </div>
                )}
              </Card>
            )}

            {/* 稼働状況 */}
            {pmProfile.availability && (
              <Card className="p-6">
                <h3 className="font-semibold mb-4">稼働状況</h3>
                {pmProfile.availability.status && (
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${
                      pmProfile.availability.status === 'available' 
                        ? 'bg-green-500' 
                        : 'bg-yellow-500'
                    }`} />
                    <span className="text-gray-700">
                      {pmProfile.availability.status === 'available' 
                        ? '稼働可能' 
                        : '要相談'}
                    </span>
                  </div>
                )}
                {pmProfile.availability.hours_per_week && (
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-500" />
                    <span className="text-gray-700">
                      週{pmProfile.availability.hours_per_week}時間まで
                    </span>
                  </div>
                )}
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}