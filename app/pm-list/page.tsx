"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { createClient } from "../../utils/supabase/client";
import LoggedInHeader from "../../components/LoggedInHeader";
import { User, MessageSquare, Star, Filter, Search, Loader2 } from "lucide-react";

interface PMProfile {
  id: string;
  full_name: string | null;
  profile_details: {
    skills?: string[];
    experience?: string;
    portfolio?: string;
    introduction?: string;
  } | null;
  rate_info: {
    hourly_rate?: string;
  } | null;
  visibility: boolean;
}

interface Project {
  id: string;
  title: string;
  status: string;
}

export default function PMListPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [pmList, setPmList] = useState<PMProfile[]>([]);
  const [filteredPmList, setFilteredPmList] = useState<PMProfile[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showScoutModal, setShowScoutModal] = useState(false);
  const [selectedPm, setSelectedPm] = useState<PMProfile | null>(null);
  const [scoutMessage, setScoutMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    // 検索フィルタリング
    if (searchTerm) {
      const filtered = pmList.filter(pm => {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = pm.full_name?.toLowerCase().includes(searchLower);
        const skillsMatch = pm.profile_details?.skills?.some(skill => 
          skill.toLowerCase().includes(searchLower)
        );
        return nameMatch || skillsMatch;
      });
      setFilteredPmList(filtered);
    } else {
      setFilteredPmList(pmList);
    }
  }, [searchTerm, pmList]);

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setCurrentUser(user);

      // ユーザープロフィールを確認（クライアントのみアクセス可能）
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_type")
        .eq("id", user.id)
        .single();

      if (profile?.user_type !== 'client') {
        router.push("/dashboard");
        return;
      }

      // PM一覧を取得
      const { data: pms, error: pmsError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "pm")
        .eq("visibility", true)
        .order("created_at", { ascending: false });

      if (pmsError) {
        console.error("Error fetching PMs:", pmsError);
      } else if (pms) {
        setPmList(pms);
        setFilteredPmList(pms);
      }

      // クライアントのプロジェクトを取得
      const { data: projects, error: projectsError } = await supabase
        .from("projects")
        .select("id, title, status")
        .eq("client_id", user.id)
        .eq("status", "public")
        .order("created_at", { ascending: false });

      if (projectsError) {
        console.error("Error fetching projects:", projectsError);
      } else if (projects) {
        setUserProjects(projects);
        if (projects.length > 0) {
          setSelectedProjectId(projects[0].id);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoutPm = (pm: PMProfile) => {
    if (userProjects.length === 0) {
      alert("スカウトするには、まず公開中のプロジェクトが必要です。");
      return;
    }
    setSelectedPm(pm);
    setShowScoutModal(true);
  };

  const sendScoutMessage = async () => {
    if (!scoutMessage.trim() || !selectedPm || !selectedProjectId) return;

    setSending(true);

    try {
      // 既存の会話があるか確認
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", currentUser.id)
        .eq("pm_id", selectedPm.id)
        .eq("project_id", selectedProjectId)
        .single();

      let conversationId;

      if (existingConv) {
        conversationId = existingConv.id;
      } else {
        // 新しい会話を作成
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            project_id: selectedProjectId,
            client_id: currentUser.id,
            pm_id: selectedPm.id,
            initiated_by: 'scout',
            status: 'active'
          })
          .select()
          .single();

        if (convError) {
          console.error("Error creating conversation:", convError);
          alert("会話の作成に失敗しました");
          return;
        }

        conversationId = newConv.id;
      }

      // メッセージを送信
      const { error: msgError } = await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          sender_id: currentUser.id,
          receiver_id: selectedPm.id,
          content: scoutMessage.trim(),
          message_type: "normal",
          project_id: selectedProjectId
        });

      if (msgError) {
        console.error("Error sending message:", msgError);
        alert("メッセージの送信に失敗しました");
      } else {
        alert("スカウトメッセージを送信しました！");
        setShowScoutModal(false);
        setScoutMessage("");
        // メッセージページへ遷移
        router.push("/messages");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("エラーが発生しました");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LoggedInHeader />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">プロジェクトマネージャーを探す</h1>
          <p className="text-gray-600">
            あなたのプロジェクトに最適なPMを見つけて、直接スカウトできます。
          </p>
        </div>

        {/* 検索バー */}
        <div className="mb-6 flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="名前やスキルで検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button variant="outline" className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            フィルター
          </Button>
        </div>

        {/* PM一覧 */}
        {filteredPmList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">該当するPMが見つかりません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPmList.map((pm) => (
              <Card key={pm.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-gray-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{pm.full_name || '名前未設定'}</h3>
                      {pm.rate_info?.hourly_rate && (
                        <p className="text-sm text-gray-500">
                          ¥{pm.rate_info.hourly_rate}/時間
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* スキル */}
                {pm.profile_details?.skills && pm.profile_details.skills.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {pm.profile_details.skills.slice(0, 3).map((skill, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                        >
                          {skill}
                        </span>
                      ))}
                      {pm.profile_details.skills.length > 3 && (
                        <span className="px-2 py-1 text-gray-500 text-xs">
                          +{pm.profile_details.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* 自己紹介 */}
                {pm.profile_details?.introduction && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                    {pm.profile_details.introduction}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => router.push(`/pm/${pm.id}`)}
                  >
                    詳細を見る
                  </Button>
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => handleScoutPm(pm)}
                  >
                    <MessageSquare className="w-4 h-4 mr-1" />
                    スカウト
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* スカウトモーダル */}
      {showScoutModal && selectedPm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {selectedPm.full_name}さんをスカウト
            </h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                プロジェクトを選択
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {userProjects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                スカウトメッセージ
              </label>
              <textarea
                value={scoutMessage}
                onChange={(e) => setScoutMessage(e.target.value)}
                placeholder="プロジェクトの概要や、なぜこのPMに興味を持ったのかを書いてください..."
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                rows={5}
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowScoutModal(false);
                  setScoutMessage("");
                }}
                disabled={sending}
              >
                キャンセル
              </Button>
              <Button
                className="flex-1"
                onClick={sendScoutMessage}
                disabled={sending || !scoutMessage.trim()}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "送信"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}