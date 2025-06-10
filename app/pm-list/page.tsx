"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { createClient } from "../../utils/supabase/client";
import LoggedInHeader from "../../components/LoggedInHeader";
import { User, MessageSquare, Star, Filter, Search, Loader2, Clock, Globe, CheckCircle, Briefcase } from "lucide-react";

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
    consultation_rate?: string;
    [key: string]: string | undefined;
  } | null;
  availability?: {
    status?: string;
    hours_per_week?: number;
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
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showScoutModal, setShowScoutModal] = useState(false);
  const [selectedPm, setSelectedPm] = useState<PMProfile | null>(null);
  const [scoutMessage, setScoutMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [matchedProjectsByPm, setMatchedProjectsByPm] = useState<Record<string, string[]>>({});

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
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile?.user_type !== 'client') {
        router.push("/dashboard");
        return;
      }

      setUserProfile(profile);

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

      // 全PMとの既存の会話（マッチング）を取得
      if (pms && pms.length > 0) {
        const { data: conversations } = await supabase
          .from("conversations")
          .select("pm_id, project_id")
          .eq("client_id", user.id)
          .in("pm_id", pms.map(pm => pm.id));

        if (conversations) {
          const matchedByPm: Record<string, string[]> = {};
          conversations.forEach(conv => {
            if (!matchedByPm[conv.pm_id]) {
              matchedByPm[conv.pm_id] = [];
            }
            matchedByPm[conv.pm_id].push(conv.project_id);
          });
          setMatchedProjectsByPm(matchedByPm);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoutPm = (pm: PMProfile) => {
    const matchedProjects = matchedProjectsByPm[pm.id] || [];
    const availableProjects = userProjects.filter(p => !matchedProjects.includes(p.id));
    
    if (userProjects.length === 0) {
      alert("スカウトするには、まず公開中のプロジェクトが必要です。");
      return;
    }
    
    if (availableProjects.length === 0) {
      alert("すべてのプロジェクトで既にマッチングしています。");
      return;
    }
    
    // 最初の利用可能なプロジェクトを選択
    setSelectedProjectId(availableProjects[0].id);
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
      {userProfile && (
        <LoggedInHeader 
          userProfile={userProfile} 
          userEmail={currentUser?.email}
        />
      )}
      
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredPmList.map((pm) => {
              const matchedProjects = matchedProjectsByPm[pm.id] || [];
              const availableProjects = userProjects.filter(p => !matchedProjects.includes(p.id));
              const canScout = userProjects.length > 0 && availableProjects.length > 0;

              return (
                <Card key={pm.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-8 h-8 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{pm.full_name || '名前未設定'}</h3>
                        
                        {/* 料金情報 */}
                        <div className="flex flex-wrap gap-3 mt-2 text-sm">
                          {pm.rate_info?.hourly_rate && (
                            <span className="text-gray-600">
                              <span className="font-medium">¥{pm.rate_info.hourly_rate}</span>/時間
                            </span>
                          )}
                          {pm.rate_info?.project_rate && (
                            <span className="text-gray-600">
                              プロジェクト: <span className="font-medium">¥{pm.rate_info.project_rate}〜</span>
                            </span>
                          )}
                        </div>

                        {/* 稼働状況 */}
                        {pm.availability && (
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            {pm.availability.status && (
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  pm.availability.status === 'available' 
                                    ? 'bg-green-500' 
                                    : 'bg-yellow-500'
                                }`} />
                                <span className="text-gray-600">
                                  {pm.availability.status === 'available' ? '稼働可能' : '要相談'}
                                </span>
                              </div>
                            )}
                            {pm.availability.hours_per_week && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Clock className="w-3 h-3" />
                                週{pm.availability.hours_per_week}時間
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* スキル */}
                  {pm.profile_details?.skills && pm.profile_details.skills.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {pm.profile_details.skills.slice(0, 5).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {pm.profile_details.skills.length > 5 && (
                          <span className="px-2 py-1 text-gray-500 text-xs">
                            +{pm.profile_details.skills.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 自己紹介 */}
                  {pm.profile_details?.introduction && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {pm.profile_details.introduction}
                    </p>
                  )}

                  {/* 経験 */}
                  {pm.profile_details?.experience && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">経験・実績</p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {pm.profile_details.experience}
                      </p>
                    </div>
                  )}

                  {/* ポートフォリオ */}
                  {pm.profile_details?.portfolio && (
                    <div className="flex items-center gap-1 mb-3 text-sm">
                      <Globe className="w-3 h-3 text-gray-500" />
                      <a 
                        href={pm.profile_details.portfolio}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        ポートフォリオ
                      </a>
                    </div>
                  )}

                  {/* マッチング状況 */}
                  {matchedProjects.length > 0 && (
                    <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                      <div className="flex items-center gap-1 text-gray-600">
                        <CheckCircle className="w-3 h-3" />
                        <span>{matchedProjects.length}個のプロジェクトでマッチ済み</span>
                      </div>
                      {availableProjects.length > 0 && (
                        <p className="text-xs text-gray-500 mt-1">
                          {availableProjects.length}個のプロジェクトでスカウト可能
                        </p>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => router.push(`/pm/${pm.id}`)}
                    >
                      詳細を見る
                    </Button>
                    {canScout ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleScoutPm(pm)}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        スカウト
                      </Button>
                    ) : userProjects.length === 0 ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        variant="secondary"
                        disabled
                      >
                        プロジェクトが必要
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        className="flex-1"
                        variant="secondary"
                        disabled
                      >
                        全てマッチ済み
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
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
                {userProjects.map((project) => {
                  const isMatched = selectedPm && matchedProjectsByPm[selectedPm.id]?.includes(project.id);
                  return (
                    <option 
                      key={project.id} 
                      value={project.id}
                      disabled={isMatched}
                    >
                      {project.title} {isMatched && '（マッチ済み）'}
                    </option>
                  );
                })}
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
                disabled={sending || !scoutMessage.trim() || (selectedPm && matchedProjectsByPm[selectedPm.id]?.includes(selectedProjectId))}
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