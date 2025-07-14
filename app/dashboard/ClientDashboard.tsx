"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { Button } from "../../components/ui/button";
import { Plus, FolderOpen, Users, MessageSquare, AlertCircle, Check, X, Sparkles } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';

interface Project {
  id: string;
  title: string;
  description: string | null;
  budget: string | null;
  duration: string | null;
  status: 'draft' | 'public' | 'private' | 'completed' | 'cancelled';
  created_at: string;
  applications_count?: number;
}

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

interface ClientDashboardProps {
  projects: Project[];
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
    if (projects.filter(p => p.status === 'public').length > 0) score += weights.hasActiveProjects;
    if (recentApplications.length > 0) score += weights.hasApplications;
    if (unreadMessageCount > 0 || recentApplications.some(a => a.status === 'accepted')) score += weights.hasMessages;
    
    return score;
  };
  
  useEffect(() => {
    setLocalApplications(recentApplications);
  }, [recentApplications]);
  
  // デバッグログ
  console.log('ClientDashboard - Projects:', projects.length, projects);
  console.log('ClientDashboard - Loading:', projectsLoading);
  
  const handleApplicationAction = async (applicationId: string, action: 'accept' | 'reject') => {
    setProcessingApplicationId(applicationId);
    
    try {
      // 応募のステータスを更新
      const newStatus = action === 'accept' ? 'accepted' : 'rejected';
      const { error: updateError } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', applicationId);
      
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
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">クライアントダッシュボード</h1>
            <p className="text-gray-600 mt-1">プロジェクトと応募状況を管理</p>
          </div>
          <div className="flex gap-2">
            <Link href="/messages">
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
            <Link href="/projects/new">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                新規プロジェクト作成
              </Button>
            </Link>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">総プロジェクト数</p>
                <p className="text-xl font-bold text-gray-800">{projects.length}</p>
              </div>
              <FolderOpen className="w-6 h-6 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">公開中</p>
                <p className="text-xl font-bold text-green-600">
                  {projects.filter(p => p.status === 'public').length}
                </p>
              </div>
              <Users className="w-6 h-6 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">新着応募</p>
                <p className="text-xl font-bold text-blue-600">
                  {recentApplications.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <MessageSquare className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ - 2カラムレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左カラム - プロジェクト情報 */}
        <div className="lg:col-span-1 space-y-4">
          {/* プロジェクト管理充実度 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                プロジェクト管理
              </h2>
              <span className="text-lg font-bold text-blue-600">
                {calculateProjectCompleteness()}%
              </span>
            </div>
        
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${calculateProjectCompleteness()}%` }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">プロジェクト作成</span>
                <span className={`text-xs ${projects.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {projects.length > 0 ? '✓' : '×'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">公開中プロジェクト</span>
                <span className={`text-xs ${projects.filter(p => p.status === 'public').length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {projects.filter(p => p.status === 'public').length > 0 ? '✓' : '×'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">応募受付</span>
                <span className={`text-xs ${recentApplications.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {recentApplications.length > 0 ? `✓ ${recentApplications.length}` : '×'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">メッセージ</span>
                <span className={`text-xs ${unreadMessageCount > 0 || recentApplications.some(a => a.status === 'accepted') ? 'text-green-600' : 'text-gray-400'}`}>
                  {unreadMessageCount > 0 || recentApplications.some(a => a.status === 'accepted') ? '✓' : '×'}
                </span>
              </div>
            </div>
            
            {calculateProjectCompleteness() < 100 && (
              <div className="mt-3 p-2 bg-blue-50 rounded">
                <p className="text-xs text-blue-700 flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  プロジェクトを公開してAI人材を探そう！
                </p>
              </div>
            )}
            
            <Link href="/projects/new">
              <Button variant="outline" size="sm" className="mt-3 w-full text-xs">
                新規プロジェクト作成
              </Button>
            </Link>
          </div>
        </div>

        {/* 右カラム - 応募とプロジェクト一覧 */}
        <div className="lg:col-span-2 space-y-4">
          {/* 最新の応募 */}
          {recentApplications.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-blue-500" />
                最新の応募
              </h2>
              <div className="space-y-2">
                {localApplications.slice(0, 3).map((application) => (
                  <div key={application.id} className="border rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-800">
                          {application.pro_profile?.full_name || 'プロフェッショナル'} さんからの応募
                        </p>
                        {application.project && (
                          <p className="text-xs text-gray-500 mt-1">
                            プロジェクト: {application.project.title}
                          </p>
                        )}
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">{application.message}</p>
                      </div>
                      <div className="ml-2">
                        {application.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 hover:bg-green-50 h-7 text-xs px-2"
                              onClick={() => handleApplicationAction(application.id, 'accept')}
                              disabled={processingApplicationId === application.id}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 h-7 text-xs px-2"
                              onClick={() => handleApplicationAction(application.id, 'reject')}
                              disabled={processingApplicationId === application.id}
                            >
                              <X className="w-3 h-3" />
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
                    <div className="mt-1 text-xs text-gray-500">
                      {new Date(application.created_at).toLocaleDateString('ja-JP')}
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

          {/* プロジェクト一覧 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-3">プロジェクト一覧</h2>
            {projectsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : projects.length === 0 ? (
              <div className="text-center py-4">
                <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">まだプロジェクトがありません</p>
                <Link href="/projects/new">
                  <Button variant="link" className="mt-2 text-sm">
                    最初のプロジェクトを作成
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {projects.slice(0, 5).map((project) => (
                  <div key={project.id} className="border rounded-lg p-3 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link href={`/projects/${project.id}`} className="text-sm font-medium text-gray-800 hover:text-blue-600 line-clamp-1">
                          {project.title}
                        </Link>
                        <div className="mt-1 flex items-center gap-3 text-xs text-gray-600">
                          <span>{getStatusBadge(project.status)}</span>
                          {project.budget && <span>{project.budget}</span>}
                          {project.applications_count && project.applications_count > 0 && (
                            <span>応募: {project.applications_count}</span>
                          )}
                        </div>
                      </div>
                      <Link href={`/projects/${project.id}/edit`}>
                        <Button variant="outline" size="sm" className="text-xs h-7">
                          編集
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
                {projects.length > 5 && (
                  <div className="text-center pt-2">
                    <Link href="/projects">
                      <Button variant="link" className="text-xs">
                        すべてのプロジェクトを見る ({projects.length}件)
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}