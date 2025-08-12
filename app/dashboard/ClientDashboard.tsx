"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { Button } from "../../components/ui/button";
import { Plus, FolderOpen, Users, MessageSquare, AlertCircle, Check, X, Sparkles, UserCheck, TrendingUp } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { supabaseWithRetry, handleSupabaseError } from '../../utils/supabase/with-retry';
import { useRouter } from 'next/navigation';
import { ProjectKanbanWrapper } from "../../components/dashboard/ProjectKanbanWrapper";
import { ProjectWithStatus } from "../../types/project-status";

// ProjectWithStatus型を使用するため、Projectインターフェースは削除

interface Application {
  id: string;
  project_id: string;
  pro_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  pro_profile?: {
    full_name: string | null;
    profile_details: any;
  };
  project?: {
    id: string;
    title: string;
  };
}

interface RecommendedPro {
  id: string;
  ai_talent_id: string;
  total_score: number;
  match_percentage: number;
  pro_profile?: {
    id: string;
    full_name: string | null;
    avatar_url?: string | null;
    profile_details?: any;
  };
}

interface ClientDashboardProps {
  projects: ProjectWithStatus[];
  recentApplications: Application[];
  projectsLoading: boolean;
  unreadMessageCount?: number;
  onApplicationUpdate?: () => void;
}

export default function ClientDashboard({ 
  projects, 
  recentApplications, 
  projectsLoading,
  unreadMessageCount = 0,
  onApplicationUpdate
}: ClientDashboardProps) {
  const router = useRouter();
  const supabase = createClient();
  const [processingApplicationId, setProcessingApplicationId] = useState<string | null>(null);
  const [localApplications, setLocalApplications] = useState<Application[]>(recentApplications);
  const [recommendedPros, setRecommendedPros] = useState<Map<string, RecommendedPro[]>>(new Map());
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  
  // プロジェクト充実度を計算
  const calculateProjectCompleteness = () => {
    let score = 0;
    const weights = {
      hasProjects: 30,       // プロジェクト作成
      hasActiveProjects: 30, // 公開中プロジェクト
      hasApplications: 20,   // 応募受付
      hasMessages: 20        // メッセージやり取り
    };
    
    if (projects.length > 0) score += weights.hasProjects;
    if (projects.filter(p => p.status === 'recruiting').length > 0) score += weights.hasActiveProjects;
    if (recentApplications.length > 0) score += weights.hasApplications;
    if (unreadMessageCount > 0 || recentApplications.some(a => a.status === 'accepted')) score += weights.hasMessages;
    
    return score;
  };
  
  useEffect(() => {
    setLocalApplications(recentApplications);
  }, [recentApplications]);
  
  // おすすめProを取得（バッチクエリで最適化）
  useEffect(() => {
    const fetchRecommendedPros = async () => {
      if (projects.length === 0) return;
      
      setLoadingRecommendations(true);
      const recommendations = new Map<string, RecommendedPro[]>();
      
      try {
        // 募集中のプロジェクトのみ対象
        const recruitingProjects = projects.filter(p => p.status === 'recruiting');
        
        if (recruitingProjects.length === 0) {
          setRecommendedPros(recommendations);
          return;
        }
        
        // バッチクエリ: 全ての募集中プロジェクトのマッチングスコアを一度に取得（リトライ付き）
        const projectIds = recruitingProjects.map(p => p.id);
        const { data: allMatchingData, error } = await supabaseWithRetry<RecommendedPro[]>(() => 
          supabase
            .from('matching_scores')
            .select(`
              id,
              project_id,
              ai_talent_id,
              total_score,
              match_percentage,
              pro_profile:profiles!ai_talent_id(
                id,
                full_name,
                avatar_url,
                profile_details
              )
            `)
            .in('project_id', projectIds)
            .order('total_score', { ascending: false })
        );
        
        if (error) {
          const errorMessage = handleSupabaseError(error, 'fetchRecommendedPros');
          console.error('Error fetching recommendations:', errorMessage);
          // エラーがあっても空の推薦リストを表示（UXを維持）
          setRecommendedPros(recommendations);
          return;
        }
        
        // プロジェクトごとに上位3件のみを抽出
        if (allMatchingData && Array.isArray(allMatchingData)) {
          for (const project of recruitingProjects) {
            const projectMatches = allMatchingData
              .filter((m: any) => m.project_id === project.id)
              .slice(0, 3)
              .map((match: any) => ({
                ...match,
                pro_profile: Array.isArray(match.pro_profile) ? match.pro_profile[0] : match.pro_profile
              }));
            
            if (projectMatches.length > 0) {
              recommendations.set(project.id, projectMatches);
            }
          }
        }
        
        setRecommendedPros(recommendations);
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoadingRecommendations(false);
      }
    };
    
    fetchRecommendedPros();
  }, [projects]);
  
  // デバッグログ
  console.log('ClientDashboard - Projects:', projects.length, projects);
  console.log('ClientDashboard - Loading:', projectsLoading);
  
  const handleApplicationAction = async (applicationId: string, action: 'accept' | 'reject') => {
    setProcessingApplicationId(applicationId);
    
    try {
      // 応募のステータスを更新（リトライ付き）
      const newStatus = action === 'accept' ? 'accepted' : 'rejected';
      const { error: updateError } = await supabaseWithRetry(() =>
        supabase
          .from('applications')
          .update({ status: newStatus })
          .eq('id', applicationId)
      );
      
      if (updateError) throw updateError;
      
      // 承認の場合、会話を作成
      if (action === 'accept') {
        const application = recentApplications.find(a => a.id === applicationId);
        if (application) {
          // conversationを作成
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { error: convError } = await supabase
              .from('conversations')
              .insert({
                project_id: application.project_id,
                client_id: user.id,
                pro_id: application.pro_id,
                application_id: applicationId,
                initiated_by: 'application',
                status: 'active'
              });
            
            if (convError && convError.code !== '23505') { // 重複エラーは無視
              console.error('Error creating conversation:', convError);
            }
          }
        }
      }
      
      // ローカルの応募ステータスを即座に更新
      setLocalApplications(prev => 
        prev.map(app => 
          app.id === applicationId 
            ? { ...app, status: newStatus } 
            : app
        )
      );
      
      // 親コンポーネントに更新を通知
      if (onApplicationUpdate) {
        onApplicationUpdate();
      }
    } catch (error) {
      console.error('Error processing application:', error);
    } finally {
      setProcessingApplicationId(null);
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
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* ヘッダーセクション */}
      <div className="bg-white p-4 rounded-lg shadow-sm" role="region" aria-label="ダッシュボードヘッダー">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">クライアントダッシュボード</h1>
            <p className="text-gray-600 mt-1">プロジェクトと応募状況を管理</p>
          </div>
          <div className="flex gap-2">
            <Link href="/messages" aria-label={`メッセージ ${unreadMessageCount > 0 ? `(未読${unreadMessageCount}件)` : ''}`}>
              <Button variant="outline" className="flex items-center gap-2 relative">
                <MessageSquare className="w-4 h-4" />
                メッセージ
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/projects/new" aria-label="新規プロジェクトを作成">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">新規プロジェクト作成</span>
                <span className="sm:hidden">新規</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* 新着応募サマリーカード（カンバンに含まれない重要情報） */}
        {recentApplications.filter(a => a.status === 'pending').length > 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Link href="/projects/my?tab=applications" className="flex items-center justify-between hover:bg-blue-100 active:bg-blue-200 transition-colors rounded px-2 py-1 touch-manipulation">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                <span className="text-xs sm:text-sm font-medium text-blue-900">新着応募が{recentApplications.filter(a => a.status === 'pending').length}件あります</span>
              </div>
              <span className="text-xs sm:text-sm text-blue-600">確認する →</span>
            </Link>
          </div>
        )}
      </div>

      {/* カンバンビュー */}
      <div className="mt-6" role="region" aria-label="プロジェクトカンバンボード">
        <ProjectKanbanWrapper 
          projects={projects}
          onProjectUpdate={onApplicationUpdate}
        />
      </div>

      {/* 下部コンテンツ - レスポンシブレイアウト */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {/* おすすめPro一覧 */}
        <div className="md:col-span-1 lg:col-span-1 space-y-4">
          {/* おすすめPro一覧 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-500" />
                おすすめPro
              </h2>
              {loadingRecommendations && (
                <span className="text-xs text-gray-500">読み込み中...</span>
              )}
            </div>
        
            {/* 募集中プロジェクトごとのおすすめPro */}
            {projects.filter(p => p.status === 'recruiting').length > 0 ? (
              <div className="space-y-3">
                {projects.filter(p => p.status === 'recruiting').map(project => {
                  const pros = recommendedPros.get(project.id) || [];
                  return (
                    <div key={project.id} className="border-t pt-3 first:border-0 first:pt-0">
                      <Link href={`/projects/${project.id}`} className="text-xs font-medium text-gray-700 hover:text-blue-600 block mb-2">
                        {project.title}
                      </Link>
                      {pros.length > 0 ? (
                        <div className="space-y-2">
                          {pros.map((pro, index) => (
                            <div key={pro.id} 
                                 className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors cursor-pointer touch-manipulation"
                                 onClick={() => router.push(`/pro/${pro.ai_talent_id}`)}
                                 onKeyDown={(e) => {
                                   if (e.key === 'Enter' || e.key === ' ') {
                                     e.preventDefault();
                                     router.push(`/pro/${pro.ai_talent_id}`);
                                   }
                                 }}
                                 tabIndex={0}
                                 role="button"
                                 aria-label={`${pro.pro_profile?.full_name || '未設定'}の詳細を見る - マッチ度${Math.round(pro.match_percentage)}%`}>
                              {/* アバター */}
                              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                {pro.pro_profile?.avatar_url ? (
                                  <img 
                                    src={pro.pro_profile.avatar_url} 
                                    alt={pro.pro_profile.full_name || ''} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span className="text-xs font-medium text-purple-700">
                                    {(pro.pro_profile?.full_name || 'P')[0].toUpperCase()}
                                  </span>
                                )}
                              </div>
                              
                              {/* 名前とスキル */}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm font-medium text-gray-800 truncate">
                                  {pro.pro_profile?.full_name || '未設定'}
                                </p>
                                <div className="flex gap-1 mt-0.5">
                                  {pro.pro_profile?.profile_details?.ai_skills?.slice(0, 1).map((skill: string, idx: number) => (
                                    <span key={idx} className="text-xs px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">
                                      {skill === 'expert' && 'エキスパート'}
                                      {skill === 'developer' && '開発者'}
                                      {skill === 'user' && '活用者'}
                                      {skill === 'supporter' && '支援者'}
                                    </span>
                                  ))}
                                  {pro.pro_profile?.profile_details?.ai_tools?.length > 0 && (
                                    <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                      {pro.pro_profile?.profile_details?.ai_tools[0]}
                                    </span>
                                  )}
                                </div>
                              </div>
                              
                              {/* マッチ度 */}
                              <div className="flex-shrink-0">
                                <span className="text-xs font-bold text-purple-600">
                                  {Math.round(pro.match_percentage)}%
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500 italic">マッチする人材を検索中...</p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-xs text-gray-500 mb-3">募集中のプロジェクトがありません</p>
                <Link href="/projects/new">
                  <Button variant="outline" size="sm" className="w-full text-xs">
                    プロジェクトを作成
                  </Button>
                </Link>
              </div>
            )}
            
            {/* Pro一覧へのリンク */}
            {projects.filter(p => p.status === 'recruiting').length > 0 && (
              <div className="mt-3 pt-3 border-t">
                <Link href="/pro-list">
                  <Button variant="ghost" size="sm" className="w-full text-xs flex items-center justify-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    すべてのProを見る
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* クイックアクション */}
        <div className="md:col-span-1 lg:col-span-2 space-y-4">
          {/* 対応待ちの応募（クイックアクション用） */}
          {localApplications.filter(a => a.status === 'pending').length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                対応待ちの応募
              </h2>
              <div className="space-y-2">
                {localApplications.filter(a => a.status === 'pending').slice(0, 2).map((application) => (
                  <div key={application.id} 
                    className="border rounded-lg p-3 hover:bg-gray-50 active:bg-gray-100 cursor-pointer group touch-manipulation" 
                    onClick={(e) => {
                      // ボタンクリック時は親要素のクリックを無視
                      if ((e.target as HTMLElement).closest('button')) return;
                      if (application.project?.id) {
                        router.push(`/projects/${application.project.id}`);
                      }
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !(e.target as HTMLElement).closest('button')) {
                        e.preventDefault();
                        if (application.project?.id) {
                          router.push(`/projects/${application.project.id}`);
                        }
                      }
                    }}
                    tabIndex={0}
                    role="article"
                    aria-label={`${application.pro_profile?.full_name || 'プロフェッショナル'}さんからの応募`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-800 group-hover:text-blue-600 transition-colors">
                            {application.pro_profile?.full_name || 'プロフェッショナル'} さんからの応募
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(application.created_at).toLocaleDateString('ja-JP')}
                          </p>
                        </div>
                        {application.project && (
                          <p className="text-xs text-gray-500 mt-1">
                            プロジェクト: {application.project.title}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{application.message}</p>
                      </div>
                      <div className="ml-2 flex-shrink-0">
                        {application.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50 active:bg-green-100 h-8 sm:h-7 text-xs px-2 touch-manipulation"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplicationAction(application.id, 'accept');
                              }}
                              disabled={processingApplicationId === application.id}
                              aria-label="応募を承認"
                            >
                              <Check className="w-3 h-3" aria-hidden="true" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 active:bg-red-100 h-8 sm:h-7 text-xs px-2 touch-manipulation"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplicationAction(application.id, 'reject');
                              }}
                              disabled={processingApplicationId === application.id}
                              aria-label="応募を却下"
                            >
                              <X className="w-3 h-3" aria-hidden="true" />
                            </Button>
                          </div>
                        )}
                        {application.status === 'accepted' && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">承認</span>
                        )}
                        {application.status === 'rejected' && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">却下</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {localApplications.length > 3 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-gray-500">
                      他{localApplications.length - 3}件の応募
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}