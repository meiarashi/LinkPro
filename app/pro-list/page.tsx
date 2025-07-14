"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { createClient } from "../../utils/supabase/client";
import LoggedInHeader from "../../components/LoggedInHeader";
import { User, MessageSquare, Star, Filter, Search, Loader2, Clock, Globe, CheckCircle, Briefcase, Sparkles, Bot } from "lucide-react";
import { AI_SKILLS, AISkillType } from "../../types/ai-talent";

interface ProProfile {
  id: string;
  full_name: string | null;
  profile_details: {
    skills?: string[];
    experience?: string;
    portfolio?: string;
    introduction?: string;
    achievements?: string;
    ai_skills?: AISkillType[];
    ai_tools?: string[];
    ai_experience?: {
      years: number;
      domains: string[];
    };
    ai_achievements?: string;
  } | null;
  rate_info: {
    hourly_rate?: string;
    project_rate?: string;
    consultation_rate?: string;
    min_rate?: string;
    max_rate?: string;
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

export default function ProListPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [proList, setProList] = useState<ProProfile[]>([]);
  const [filteredProList, setFilteredProList] = useState<ProProfile[]>([]);
  const [userProjects, setUserProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [showScoutModal, setShowScoutModal] = useState(false);
  const [selectedPro, setSelectedPro] = useState<ProProfile | null>(null);
  const [scoutMessage, setScoutMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [matchedProjectsByPro, setMatchedProjectsByPro] = useState<Record<string, string[]>>({});
  
  // フィルター関連の状態
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSkillTypes, setSelectedSkillTypes] = useState<AISkillType[]>([]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [showAvailableOnly, setShowAvailableOnly] = useState(false);
  const [selectedExperience, setSelectedExperience] = useState<number | null>(null);
  const [selectedRateRange, setSelectedRateRange] = useState<{min?: number, max?: number} | null>(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    // 検索とフィルタリング
    let filtered = proList;
    
    // テキスト検索
    if (searchTerm) {
      filtered = filtered.filter(pro => {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = pro.full_name?.toLowerCase().includes(searchLower);
        const skillsMatch = pro.profile_details?.skills?.some(skill => 
          skill.toLowerCase().includes(searchLower)
        );
        const aiToolsMatch = pro.profile_details?.ai_tools?.some(tool =>
          tool.toLowerCase().includes(searchLower)
        );
        const aiSkillsMatch = pro.profile_details?.ai_skills?.some(skillType => {
          const skill = AI_SKILLS[skillType];
          return skill?.label.toLowerCase().includes(searchLower);
        });
        return nameMatch || skillsMatch || aiToolsMatch || aiSkillsMatch;
      });
    }
    
    // AIスキルタイプフィルター
    if (selectedSkillTypes.length > 0) {
      filtered = filtered.filter(pro => 
        pro.profile_details?.ai_skills?.some(skill => 
          selectedSkillTypes.includes(skill)
        )
      );
    }
    
    // AIツールフィルター
    if (selectedTools.length > 0) {
      filtered = filtered.filter(pro =>
        pro.profile_details?.ai_tools?.some(tool =>
          selectedTools.includes(tool)
        )
      );
    }
    
    // 経験年数フィルター
    if (selectedExperience !== null) {
      filtered = filtered.filter(pro => {
        const years = pro.profile_details?.ai_experience?.years;
        if (selectedExperience === 0) return years === 0;
        if (selectedExperience === 1) return years === 1 || years === 2;
        if (selectedExperience === 3) return years !== undefined && years >= 3;
        return false;
      });
    }
    
    // 料金帯フィルター
    if (selectedRateRange) {
      filtered = filtered.filter(pro => {
        const hourlyRate = parseInt(pro.rate_info?.hourly_rate || '0');
        const minRate = parseInt(pro.rate_info?.min_rate || '0');
        const maxRate = parseInt(pro.rate_info?.max_rate || '0');
        
        // 複数の料金形式に対応
        const rate = hourlyRate || minRate || maxRate;
        
        if (selectedRateRange.min && selectedRateRange.max) {
          return rate >= selectedRateRange.min && rate <= selectedRateRange.max;
        } else if (selectedRateRange.min) {
          return rate >= selectedRateRange.min;
        } else if (selectedRateRange.max) {
          return rate <= selectedRateRange.max;
        }
        return true;
      });
    }
    
    // 稼働可能フィルター
    if (showAvailableOnly) {
      filtered = filtered.filter(pro =>
        pro.availability?.status === 'available' ||
        pro.availability?.status === 'full-time' ||
        pro.availability?.status === 'part-time'
      );
    }
    
    setFilteredProList(filtered);
  }, [searchTerm, proList, selectedSkillTypes, selectedTools, showAvailableOnly, selectedExperience, selectedRateRange]);

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

      // プロフェッショナル一覧を取得
      const { data: pros, error: prosError } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "pro")
        .eq("visibility", true)
        .order("created_at", { ascending: false });

      if (prosError) {
        console.error("Error fetching professionals:", prosError);
      } else if (pros) {
        setProList(pros);
        setFilteredProList(pros);
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

      // 全プロフェッショナルとの既存の会話（マッチング）を取得
      if (pros && pros.length > 0) {
        const { data: conversations } = await supabase
          .from("conversations")
          .select("pro_id, project_id")
          .eq("client_id", user.id)
          .in("pro_id", pros.map(pro => pro.id));

        if (conversations) {
          const matchedByPro: Record<string, string[]> = {};
          conversations.forEach(conv => {
            if (!matchedByPro[conv.pro_id]) {
              matchedByPro[conv.pro_id] = [];
            }
            matchedByPro[conv.pro_id].push(conv.project_id);
          });
          setMatchedProjectsByPro(matchedByPro);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScoutPro = (pro: ProProfile) => {
    const matchedProjects = matchedProjectsByPro[pro.id] || [];
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
    setSelectedPro(pro);
    setShowScoutModal(true);
  };

  const sendScoutMessage = async () => {
    if (!scoutMessage.trim() || !selectedPro || !selectedProjectId) return;

    setSending(true);

    try {
      // 既存の会話があるか確認
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("client_id", currentUser.id)
        .eq("pro_id", selectedPro.id)
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
            pro_id: selectedPro.id,
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
          receiver_id: selectedPro.id,
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
          <h1 className="text-3xl font-bold mb-4">プロフェッショナルを探す</h1>
          <p className="text-gray-600">
            あなたのプロジェクトに最適なプロフェッショナルを見つけて、直接スカウトできます。
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
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="w-4 h-4" />
            フィルター
            {(selectedSkillTypes.length > 0 || selectedTools.length > 0 || showAvailableOnly || 
              selectedExperience !== null || selectedRateRange !== null) && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
                {selectedSkillTypes.length + selectedTools.length + 
                 (showAvailableOnly ? 1 : 0) + 
                 (selectedExperience !== null ? 1 : 0) + 
                 (selectedRateRange !== null ? 1 : 0)}
              </span>
            )}
          </Button>
        </div>

        {/* フィルターパネル */}
        {showFilters && (
          <Card className="mb-6 p-4">
            <div className="space-y-4">
              {/* AIスキルタイプフィルター */}
              <div>
                <h3 className="font-medium mb-2">AIスキルタイプ</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(AI_SKILLS).map(([key, skill]) => (
                    <button
                      key={key}
                      onClick={() => {
                        if (selectedSkillTypes.includes(key as AISkillType)) {
                          setSelectedSkillTypes(selectedSkillTypes.filter(s => s !== key));
                        } else {
                          setSelectedSkillTypes([...selectedSkillTypes, key as AISkillType]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedSkillTypes.includes(key as AISkillType)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {skill.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* AIツールフィルター */}
              <div>
                <h3 className="font-medium mb-2">AIツール</h3>
                <div className="flex flex-wrap gap-2">
                  {['ChatGPT', 'Claude', 'GitHub Copilot', 'Midjourney', 'Stable Diffusion'].map((tool) => (
                    <button
                      key={tool}
                      onClick={() => {
                        if (selectedTools.includes(tool)) {
                          setSelectedTools(selectedTools.filter(t => t !== tool));
                        } else {
                          setSelectedTools([...selectedTools, tool]);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedTools.includes(tool)
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {tool}
                    </button>
                  ))}
                </div>
              </div>

              {/* 経験年数フィルター */}
              <div>
                <h3 className="font-medium mb-2">AI活用経験</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '1年未満', value: 0 },
                    { label: '1-2年', value: 1 },
                    { label: '3年以上', value: 3 }
                  ].map((exp) => (
                    <button
                      key={exp.value}
                      onClick={() => {
                        if (selectedExperience === exp.value) {
                          setSelectedExperience(null);
                        } else {
                          setSelectedExperience(exp.value);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedExperience === exp.value
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {exp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 料金帯フィルター */}
              <div>
                <h3 className="font-medium mb-2">時間単価</h3>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '〜¥3,000', max: 3000 },
                    { label: '¥3,000〜¥5,000', min: 3000, max: 5000 },
                    { label: '¥5,000〜', min: 5000 }
                  ].map((rate, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        if (selectedRateRange?.min === rate.min && selectedRateRange?.max === rate.max) {
                          setSelectedRateRange(null);
                        } else {
                          setSelectedRateRange(rate);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        selectedRateRange?.min === rate.min && selectedRateRange?.max === rate.max
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 hover:bg-gray-200'
                      }`}
                    >
                      {rate.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* その他のフィルター */}
              <div>
                <h3 className="font-medium mb-2">その他</h3>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={showAvailableOnly}
                    onChange={(e) => setShowAvailableOnly(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">稼働可能な人材のみ表示</span>
                </label>
              </div>

              {/* フィルタークリア */}
              {(selectedSkillTypes.length > 0 || selectedTools.length > 0 || showAvailableOnly || 
                selectedExperience !== null || selectedRateRange !== null) && (
                <button
                  onClick={() => {
                    setSelectedSkillTypes([]);
                    setSelectedTools([]);
                    setShowAvailableOnly(false);
                    setSelectedExperience(null);
                    setSelectedRateRange(null);
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  すべてのフィルターをクリア
                </button>
              )}
            </div>
          </Card>
        )}

        {/* プロフェッショナル一覧 */}
        {filteredProList.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">該当するプロフェッショナルが見つかりません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredProList.map((pro) => {
              const matchedProjects = matchedProjectsByPro[pro.id] || [];
              const availableProjects = userProjects.filter(p => !matchedProjects.includes(p.id));
              const canScout = userProjects.length > 0 && availableProjects.length > 0;

              return (
                <Card key={pro.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-8 h-8 text-gray-500" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-1">{pro.full_name || '名前未設定'}</h3>

                        {/* AIスキルタイプ */}
                        {pro.profile_details?.ai_skills && pro.profile_details.ai_skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {pro.profile_details.ai_skills.map((skillType) => {
                              const skill = AI_SKILLS[skillType];
                              if (!skill) return null;
                              return (
                                <span
                                  key={skillType}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                >
                                  {skill.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                        
                        {/* 料金情報 */}
                        <div className="flex flex-wrap gap-3 mt-2 text-sm">
                          {(pro.rate_info?.min_rate || pro.rate_info?.max_rate) && (
                            <span className="text-gray-600">
                              単価: <span className="font-medium">
                                {pro.rate_info.min_rate && `¥${pro.rate_info.min_rate}`}
                                {pro.rate_info.min_rate && pro.rate_info.max_rate && ' 〜 '}
                                {pro.rate_info.max_rate && `¥${pro.rate_info.max_rate}`}
                              </span>/時間
                            </span>
                          )}
                          {pro.rate_info?.hourly_rate && 
                           !pro.rate_info?.min_rate && !pro.rate_info?.max_rate && (
                            <span className="text-gray-600">
                              <span className="font-medium">¥{pro.rate_info.hourly_rate}</span>/時間
                            </span>
                          )}
                          {pro.rate_info?.project_rate && (
                            <span className="text-gray-600">
                              プロジェクト: <span className="font-medium">¥{pro.rate_info.project_rate}〜</span>
                            </span>
                          )}
                        </div>

                        {/* 稼働状況 */}
                        {pro.availability && (
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            {pro.availability.status && (
                              <div className="flex items-center gap-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  pro.availability.status === 'available' 
                                    ? 'bg-green-500' 
                                    : 'bg-yellow-500'
                                }`} />
                                <span className="text-gray-600">
                                  {pro.availability.status === 'available' ? '稼働可能' : '要相談'}
                                </span>
                              </div>
                            )}
                            {pro.availability.hours_per_week && (
                              <div className="flex items-center gap-1 text-gray-600">
                                <Clock className="w-3 h-3" />
                                週{pro.availability.hours_per_week}時間
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* スキル */}
                  {pro.profile_details?.skills && pro.profile_details.skills.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-2">
                        {pro.profile_details.skills.slice(0, 5).map((skill, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded"
                          >
                            {skill}
                          </span>
                        ))}
                        {pro.profile_details.skills.length > 5 && (
                          <span className="px-2 py-1 text-gray-500 text-xs">
                            +{pro.profile_details.skills.length - 5}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AIツール */}
                  {pro.profile_details?.ai_tools && pro.profile_details.ai_tools.length > 0 && (
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="w-3 h-3 text-gray-500" />
                        <span className="text-xs text-gray-500">使用可能なAIツール</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {pro.profile_details.ai_tools.slice(0, 6).map((tool, index) => (
                          <span
                            key={index}
                            className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {tool}
                          </span>
                        ))}
                        {pro.profile_details.ai_tools.length > 6 && (
                          <span className="px-2 py-0.5 text-gray-500 text-xs">
                            +{pro.profile_details.ai_tools.length - 6}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 自己紹介 */}
                  {pro.profile_details?.introduction && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-3">
                      {pro.profile_details.introduction}
                    </p>
                  )}

                  {/* 経験 */}
                  {pro.profile_details?.experience && (
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">経験・実績</p>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {pro.profile_details.experience}
                      </p>
                    </div>
                  )}

                  {/* ポートフォリオ */}
                  {pro.profile_details?.portfolio && (
                    <div className="flex items-center gap-1 mb-3 text-sm">
                      <Globe className="w-3 h-3 text-gray-500" />
                      <a 
                        href={pro.profile_details.portfolio}
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
                      onClick={() => router.push(`/pro/${pro.id}`)}
                    >
                      詳細を見る
                    </Button>
                    {canScout ? (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleScoutPro(pro)}
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
      {showScoutModal && selectedPro && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">
              {selectedPro.full_name}さんをスカウト
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
                  const isMatched = selectedPro && matchedProjectsByPro[selectedPro.id]?.includes(project.id);
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
                placeholder="プロジェクトの概要や、なぜこのプロフェッショナルに興味を持ったのかを書いてください..."
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
                disabled={sending || !scoutMessage.trim() || (selectedPro && matchedProjectsByPro[selectedPro.id]?.includes(selectedProjectId))}
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