"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../../components/ui/button";
import { createClient } from "../../../utils/supabase/client";
import LoggedInHeader from "../../../components/LoggedInHeader";
import Link from "next/link";
import { 
  ArrowLeft, 
  Edit, 
  Calendar, 
  DollarSign, 
  Users, 
  CheckCircle,
  XCircle,
  Clock,
  Sparkles,
  Target
} from "lucide-react";
import { useToast } from "../../../components/ui/toast";
import { LoadingPage } from "../../../components/ui/loading";

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  budget: string | null;
  duration: string | null;
  status: 'draft' | 'recruiting' | 'executing' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  client_id: string;
}

interface Application {
  id: string;
  project_id: string;
  pro_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  pro_profile: {
    id: string;
    full_name: string | null;
    profile_details: any;
    rate_info: any;
    availability: any;
  };
}

interface MatchingScore {
  id: string;
  project_id: string;
  ai_talent_id: string;
  pro_id: string;
  level_match_score: number;
  tool_match_score: number;
  domain_match_score: number;
  experience_score: number;
  availability_score: number;
  total_score: number;
  match_percentage: number;
  recommendation_reason: string;
  match_details: any;
  pro_profile?: {
    id: string;
    full_name: string | null;
    profile_details: any;
    rate_info: any;
    availability: string;
  };
}

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  const { addToast } = useToast();
  
  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [matchingScores, setMatchingScores] = useState<MatchingScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [applicationStatusUpdating, setApplicationStatusUpdating] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);
  const [user, setUser] = useState<any>(null);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [applicationMessage, setApplicationMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchProjectData();
  }, [params.id]);

  const fetchProjectData = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push("/login");
        return;
      }
      
      setUser(currentUser);

      // プロジェクト情報を取得
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select("*")
        .eq("id", params.id)
        .single();

      if (projectError || !projectData) {
        console.error("Error fetching project:", projectError);
        router.push("/dashboard");
        return;
      }

      setProject(projectData);
      setIsOwner(projectData.client_id === currentUser.id);

      // ユーザープロフィールを取得
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();
      
      if (profileData) {
        setUserProfile(profileData);
      }

      // プロフェッショナルの場合、既に応募しているかチェック
      if (profileData?.user_type === 'pro') {
        const { data: existingApplications } = await supabase
          .from("applications")
          .select("id")
          .eq("project_id", params.id)
          .eq("pro_id", currentUser.id);
        
        setHasApplied(!!existingApplications && existingApplications.length > 0);
      }

      // プロジェクトオーナーの場合は応募情報も取得
      if (projectData.client_id === currentUser.id) {
        const { data: applicationsData, error: applicationsError } = await supabase
          .from("applications")
          .select("*")
          .eq("project_id", params.id)
          .order("created_at", { ascending: false });
        
        if (applicationsData && applicationsData.length > 0) {
          // プロフィール情報を別途取得
          const proIds = Array.from(new Set(applicationsData.map(app => app.pro_id)));
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, profile_details, rate_info, availability')
            .in('id', proIds);
          
          // プロフィール情報をマージ
          const applicationsWithProfiles = applicationsData.map(app => ({
            ...app,
            pro_profile: profilesData?.find(p => p.id === app.pro_id)
          }));
          
          setApplications(applicationsWithProfiles);
        }

        if (applicationsError) {
          console.error("Error fetching applications:", applicationsError);
        }

        // マッチングスコアも取得（プロジェクトオーナーの場合）
        const { data: matchingData } = await supabase
          .from("matching_scores")
          .select(`
            *,
            pro_profile:profiles!pro_id(
              id,
              full_name,
              profile_details,
              rate_info,
              availability
            )
          `)
          .eq("project_id", params.id)
          .order("total_score", { ascending: false })
          .limit(10);
        
        if (matchingData) {
          // すでに応募している人材のIDリスト
          const appliedProIds = applicationsData?.map(app => app.pro_id) || [];
          
          // 応募していない人材のマッチングスコアのみ表示
          const filteredMatchingData = matchingData.filter(
            match => !appliedProIds.includes(match.ai_talent_id)
          );
          
          setMatchingScores(filteredMatchingData);
        }
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplicationSubmit = async () => {
    if (!userProfile || userProfile.user_type !== 'pro') return;
    
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error } = await supabase
        .from("applications")
        .insert({
          project_id: params.id,
          pro_id: user.id,
          status: 'pending',
          message: applicationMessage
        });

      if (error) {
        // 重複応募エラーのチェック
        if (error.code === '23505' || error.message?.includes('duplicate')) {
          addToast({
            type: "warning",
            message: "すでにこのプロジェクトに応募済みです",
          });
          setHasApplied(true);
        } else {
          throw error;
        }
      } else {
        setHasApplied(true);
        setShowApplicationModal(false);
        setApplicationMessage('');
        addToast({
          type: "success",
          message: "応募が完了しました！クライアントからの返信をお待ちください。",
        });
        
        // ページをリロードして最新状態を取得
        setTimeout(() => {
          fetchProjectData();
        }, 1000);
      }
    } catch (error: any) {
      console.error('Error submitting application:', error);
      addToast({
        type: "error",
        message: error.message || "応募に失敗しました。もう一度お試しください。",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplicationStatusUpdate = async (applicationId: string, newStatus: 'accepted' | 'rejected' | 'pending') => {
    setApplicationStatusUpdating(applicationId);
    
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", applicationId);

      if (error) {
        throw error;
      }

      // 応募リストを更新
      setApplications(prev => 
        prev.map(app => 
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      );
      
      addToast({
        type: "success",
        message: newStatus === 'accepted' ? "応募を承認しました" : "応募を却下しました",
      });
    } catch (error) {
      console.error("Error updating application status:", error);
      addToast({
        type: "error",
        message: "ステータスの更新に失敗しました",
      });
    } finally {
      setApplicationStatusUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: '下書き', className: 'bg-gray-100 text-gray-700' },
      recruiting: { label: '募集中', className: 'bg-green-100 text-green-700' },
      executing: { label: '実行中', className: 'bg-blue-100 text-blue-700' },
      completed: { label: '完了', className: 'bg-purple-100 text-purple-700' },
      cancelled: { label: 'キャンセル', className: 'bg-red-100 text-red-700' }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  const getApplicationStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  if (loading) {
    return <LoadingPage />;
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>プロジェクトが見つかりません</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 統一ヘッダー */}
      {userProfile && <LoggedInHeader userProfile={userProfile} userEmail={user?.email} />}

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-8 max-w-6xl">
        {/* 戻るボタン */}
        <div className="mb-6">
          <Link href={isOwner ? "/dashboard" : "/projects"}>
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              {isOwner ? "ダッシュボードに戻る" : "プロジェクト一覧に戻る"}
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* プロジェクト情報 */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-start justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">{project.title}</h2>
                {getStatusBadge(project.status)}
              </div>

              <div className="prose max-w-none">
                <p className="text-gray-600 whitespace-pre-wrap">{project.description}</p>
              </div>

            </div>
          </div>

          {/* サイドバー */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-800">プロジェクト情報</h3>
                {isOwner && (
                  <Link href={`/projects/${project.id}/edit`}>
                    <Button variant="outline" size="sm" className="flex items-center gap-1">
                      <Edit className="w-4 h-4" />
                      編集
                    </Button>
                  </Link>
                )}
              </div>
              
              <div className="space-y-3">
                {project.budget && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">予算</p>
                      <p className="font-medium">{project.budget}</p>
                    </div>
                  </div>
                )}
                
                {project.duration && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">期間</p>
                      <p className="font-medium">{project.duration}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-500">応募数</p>
                    <p className="font-medium">{applications.length} 件</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500">
                  作成日: {new Date(project.created_at).toLocaleDateString('ja-JP')}
                </p>
                <p className="text-sm text-gray-500">
                  更新日: {new Date(project.updated_at).toLocaleDateString('ja-JP')}
                </p>
              </div>

              {/* プロフェッショナルの応募ボタン */}
              {userProfile?.user_type === 'pro' && !isOwner && (
                <div className="mt-4 pt-4 border-t">
                  {hasApplied ? (
                    <Button disabled className="w-full">
                      応募済み
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => setShowApplicationModal(true)}
                      className="w-full"
                    >
                      このプロジェクトに応募する
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 応募一覧（オーナーのみ） */}
        {isOwner && (
          <div className="mt-8 bg-white p-6 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-800">応募一覧</h3>
              {applications.length > 0 && (
                <div className="flex gap-2 text-sm">
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full">
                    未対応: {applications.filter(a => a.status === 'pending').length}
                  </span>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                    承認済み: {applications.filter(a => a.status === 'accepted').length}
                  </span>
                  <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full">
                    却下済み: {applications.filter(a => a.status === 'rejected').length}
                  </span>
                </div>
              )}
            </div>
            
            {applications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">まだ応募がありません</p>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div key={application.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {/* 応募者名をクリック可能に */}
                          <Link href={`/pro/${application.pro_id}`} className="hover:text-blue-600">
                            <h4 className="font-medium text-gray-800 underline decoration-dotted underline-offset-2">
                              {application.pro_profile.full_name || 'プロフィール未設定'}
                            </h4>
                          </Link>
                          
                          {/* ステータスバッジの改善 */}
                          <div className="flex items-center gap-2">
                            {application.status === 'pending' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                                <Clock className="w-3 h-3" />
                                未対応
                              </span>
                            )}
                            {application.status === 'accepted' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                                <CheckCircle className="w-3 h-3" />
                                承認済み
                              </span>
                            )}
                            {application.status === 'rejected' && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                                <XCircle className="w-3 h-3" />
                                却下済み
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {application.message && (
                          <div className="bg-gray-50 p-3 rounded-md mb-2">
                            <p className="text-sm text-gray-600">{application.message}</p>
                          </div>
                        )}
                        
                        {/* プロフィール情報の追加 */}
                        {application.pro_profile.profile_details && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {application.pro_profile.profile_details.ai_skills?.slice(0, 2).map((skill: string, index: number) => (
                              <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                {skill === 'expert' && 'エキスパート'}
                                {skill === 'developer' && '開発者'}
                                {skill === 'user' && '活用者'}
                                {skill === 'supporter' && '支援者'}
                              </span>
                            ))}
                            {application.pro_profile.availability && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                                {application.pro_profile.availability}
                              </span>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-500">
                          応募日: {new Date(application.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        {/* プロフィール詳細ボタンを常に表示 */}
                        <Link href={`/pro/${application.pro_id}`}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            詳細を見る
                          </Button>
                        </Link>
                        
                        {/* ステータス変更ボタン */}
                        {application.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              className="w-full"
                              onClick={() => handleApplicationStatusUpdate(application.id, 'accepted')}
                              disabled={applicationStatusUpdating === application.id}
                            >
                              承認する
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => handleApplicationStatusUpdate(application.id, 'rejected')}
                              disabled={applicationStatusUpdating === application.id}
                            >
                              却下する
                            </Button>
                          </>
                        )}
                        
                        {/* ステータス変更可能（承認済み・却下済みから変更） */}
                        {application.status === 'accepted' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-yellow-600 hover:bg-yellow-50"
                            onClick={() => handleApplicationStatusUpdate(application.id, 'pending')}
                            disabled={applicationStatusUpdating === application.id}
                          >
                            保留に戻す
                          </Button>
                        )}
                        {application.status === 'rejected' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-green-600 hover:bg-green-50"
                            onClick={() => handleApplicationStatusUpdate(application.id, 'accepted')}
                            disabled={applicationStatusUpdating === application.id}
                          >
                            承認に変更
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* マッチングした人材（オーナーのみ） */}
        {isOwner && matchingScores.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg shadow-sm border border-purple-100">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              このプロジェクトに適したAI人材
            </h3>
            
            <div className="space-y-4">
              {matchingScores.slice(0, 5).map((match, index) => (
                <div key={match.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-gray-800">
                          {match.pro_profile?.full_name || 'プロフィール未設定'}
                        </h4>
                        {index === 0 && (
                          <span className="px-2 py-1 text-xs font-bold rounded-full bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                            最も適合
                          </span>
                        )}
                      </div>
                      
                      {/* シンプルな推薦理由 */}
                      <div className="text-sm text-gray-600 mb-3 space-y-1">
                        {match.pro_profile?.profile_details?.ai_skills?.includes('expert') && 
                         match.pro_profile?.profile_details?.ai_experience?.years >= 3 && (
                          <p className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            豊富な経験を持つエキスパートです
                          </p>
                        )}
                        {match.tool_match_score >= 20 && (
                          <p className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            必要なAIツールの経験があります
                          </p>
                        )}
                        {match.domain_match_score >= 15 && (
                          <p className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            関連する業務領域の実績があります
                          </p>
                        )}
                      </div>
                      
                      {/* AIスキル情報 */}
                      <div className="flex flex-wrap gap-2">
                        {match.pro_profile?.profile_details?.ai_skills?.map((skill: string, index: number) => (
                          <span key={index} className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                            {skill === 'expert' && 'エキスパート'}
                            {skill === 'developer' && '開発者'}
                            {skill === 'user' && '活用者'}
                            {skill === 'supporter' && '支援者'}
                          </span>
                        ))}
                        {match.pro_profile?.profile_details?.ai_tools?.slice(0, 3).map((tool: string, index: number) => (
                          <span key={`tool-${index}`} className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            {tool}
                          </span>
                        ))}
                        {match.pro_profile?.profile_details?.ai_tools && match.pro_profile.profile_details.ai_tools.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-full text-xs">
                            +{match.pro_profile.profile_details.ai_tools.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex flex-col gap-2">
                      <Link href={`/pro/${match.ai_talent_id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          詳細を見る
                        </Button>
                      </Link>
                      <Button 
                        size="sm" 
                        className="w-full bg-purple-600 hover:bg-purple-700"
                        onClick={() => {
                          addToast({
                            type: "warning",
                            message: "スカウト機能は現在準備中です。応募をお待ちください。",
                          });
                        }}
                      >
                        スカウトする
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {matchingScores.length > 5 && (
              <div className="mt-4 text-center">
                <Link href="/pro-list">
                  <Button variant="outline" size="sm">
                    他の候補者も見る
                  </Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 応募モーダル */}
      {showApplicationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">プロジェクトに応募する</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                応募メッセージ
              </label>
              <textarea
                value={applicationMessage}
                onChange={(e) => setApplicationMessage(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="クライアントへのメッセージを入力してください。あなたの経験やこのプロジェクトへの興味、貢献できることなどを記載しましょう。"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowApplicationModal(false);
                  setApplicationMessage('');
                }}
                disabled={submitting}
              >
                キャンセル
              </Button>
              <Button
                onClick={handleApplicationSubmit}
                disabled={submitting || !applicationMessage.trim()}
              >
                {submitting ? '送信中...' : '応募する'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}