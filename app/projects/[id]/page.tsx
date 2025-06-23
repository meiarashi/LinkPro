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
  Clock
} from "lucide-react";

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
  required_skills: string[];
  status: 'draft' | 'public' | 'private' | 'completed' | 'cancelled';
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

export default function ProjectDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const supabase = createClient();
  
  const [project, setProject] = useState<Project | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
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
        
        setHasApplied(existingApplications && existingApplications.length > 0);
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

      if (error) throw error;

      setHasApplied(true);
      setShowApplicationModal(false);
      setApplicationMessage('');
      alert('応募が完了しました！');
      
      // ページをリロードして最新状態を取得
      loadProjectData();
    } catch (error) {
      console.error('Error submitting application:', error);
      alert('応募に失敗しました。もう一度お試しください。');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplicationStatusUpdate = async (applicationId: string, newStatus: 'accepted' | 'rejected') => {
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
    } catch (error) {
      console.error("Error updating application status:", error);
      alert("ステータスの更新に失敗しました");
    } finally {
      setApplicationStatusUpdating(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: '下書き', className: 'bg-gray-100 text-gray-700' },
      public: { label: '公開中', className: 'bg-green-100 text-green-700' },
      private: { label: '非公開', className: 'bg-yellow-100 text-yellow-700' },
      completed: { label: '完了', className: 'bg-blue-100 text-blue-700' },
      cancelled: { label: '中止', className: 'bg-red-100 text-red-700' }
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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
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

              {project.required_skills.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">求めるスキル</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.required_skills.map((skill: string) => (
                      <span
                        key={skill}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}
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
            <h3 className="text-lg font-semibold text-gray-800 mb-4">応募一覧</h3>
            
            {applications.length === 0 ? (
              <p className="text-gray-500 text-center py-8">まだ応募がありません</p>
            ) : (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div key={application.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-medium text-gray-800">
                            {application.pro_profile.full_name || 'プロフィール未設定'}
                          </h4>
                          {getApplicationStatusIcon(application.status)}
                        </div>
                        
                        {application.message && (
                          <p className="text-sm text-gray-600 mb-2">{application.message}</p>
                        )}
                        
                        <p className="text-xs text-gray-500">
                          応募日: {new Date(application.created_at).toLocaleDateString('ja-JP')}
                        </p>
                      </div>
                      
                      {application.status === 'pending' && (
                        <div className="flex gap-2 ml-4">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplicationStatusUpdate(application.id, 'accepted')}
                            disabled={applicationStatusUpdating === application.id}
                          >
                            承認
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApplicationStatusUpdate(application.id, 'rejected')}
                            disabled={applicationStatusUpdating === application.id}
                          >
                            却下
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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