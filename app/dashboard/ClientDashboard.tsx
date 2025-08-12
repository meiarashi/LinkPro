"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { Button } from "../../components/ui/button";
import { Plus, FolderOpen, Users, MessageSquare, AlertCircle, Check, X, Sparkles } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import { ProjectKanban } from "../../components/dashboard/ProjectKanbanDnd";
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

        {/* 新着応募サマリーカード（カンバンに含まれない重要情報） */}
        {recentApplications.filter(a => a.status === 'pending').length > 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <Link href="/projects/my?tab=applications" className="flex items-center justify-between hover:bg-blue-100 transition-colors rounded px-2 py-1">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">新着応募が{recentApplications.filter(a => a.status === 'pending').length}件あります</span>
              </div>
              <span className="text-sm text-blue-600">確認する →</span>
            </Link>
          </div>
        )}
      </div>

      {/* カンバンビュー */}
      <div className="mt-6">
        <ProjectKanban 
          projects={projects}
          onProjectUpdate={onApplicationUpdate}
        />
      </div>

      {/* 下部コンテンツ - 2カラムレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
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
                <span className="text-xs text-gray-600">募集中プロジェクト</span>
                <span className={`text-xs ${projects.filter(p => p.status === 'recruiting').length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {projects.filter(p => p.status === 'recruiting').length > 0 ? '✓' : '×'}
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

        {/* 右カラム - クイックアクション */}
        <div className="lg:col-span-2 space-y-4">
          {/* 対応待ちの応募（クイックアクション用） */}
          {localApplications.filter(a => a.status === 'pending').length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <h2 className="text-base font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                対応待ちの応募
              </h2>
              <div className="space-y-2">
                {localApplications.filter(a => a.status === 'pending').slice(0, 2).map((application) => (
                  <div key={application.id} className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer group" onClick={(e) => {
                    // ボタンクリック時は親要素のクリックを無視
                    if ((e.target as HTMLElement).closest('button')) return;
                    if (application.project?.id) {
                      router.push(`/projects/${application.project.id}`);
                    }
                  }}>
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
                              className="text-green-600 hover:bg-green-50 h-7 text-xs px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplicationAction(application.id, 'accept');
                              }}
                              disabled={processingApplicationId === application.id}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:bg-red-50 h-7 text-xs px-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplicationAction(application.id, 'reject');
                              }}
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