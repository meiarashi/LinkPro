"use client";

import { useState, useEffect } from "react";
import Link from 'next/link';
import { Button } from "../../components/ui/button";
import { Plus, FolderOpen, Users, MessageSquare, AlertCircle, Check, X } from 'lucide-react';
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
  pm_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  pm_profile?: {
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
                pm_id: application.pm_id,
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
    <div className="space-y-6">
      {/* ヘッダーセクション */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総プロジェクト数</p>
                <p className="text-2xl font-bold text-gray-800">{projects.length}</p>
              </div>
              <FolderOpen className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">公開中</p>
                <p className="text-2xl font-bold text-green-600">
                  {projects.filter(p => p.status === 'public').length}
                </p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">新着応募</p>
                <p className="text-2xl font-bold text-blue-600">
                  {recentApplications.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* 最新の応募 */}
      {recentApplications.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500" />
            応募一覧（最新10件）
          </h2>
          <div className="space-y-3">
            {localApplications.map((application) => (
              <div key={application.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {application.pm_profile?.full_name || 'PM'} さんからの応募
                    </p>
                    {application.project && (
                      <p className="text-xs text-gray-500">
                        プロジェクト: {application.project.title}
                      </p>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600 mt-1">{application.message}</p>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-gray-500">
                    {new Date(application.created_at).toLocaleDateString('ja-JP')}
                  </p>
                  {application.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:bg-green-50"
                        onClick={() => handleApplicationAction(application.id, 'accept')}
                        disabled={processingApplicationId === application.id}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        承認
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={() => handleApplicationAction(application.id, 'reject')}
                        disabled={processingApplicationId === application.id}
                      >
                        <X className="w-4 h-4 mr-1" />
                        却下
                      </Button>
                    </div>
                  )}
                  {application.status === 'accepted' && (
                    <span className="text-xs text-green-600 font-medium">承認済み</span>
                  )}
                  {application.status === 'rejected' && (
                    <span className="text-xs text-red-600 font-medium">却下済み</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* プロジェクト一覧 */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">プロジェクト一覧</h2>
        {projectsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">まだプロジェクトがありません</p>
            <Link href="/projects/new">
              <Button variant="link" className="mt-2">
                最初のプロジェクトを作成
              </Button>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">タイトル</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">ステータス</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">予算</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">期間</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">応募数</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">作成日</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link href={`/projects/${project.id}`} className="text-blue-600 hover:underline">
                        {project.title}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(project.status)}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{project.budget || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{project.duration || '-'}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{project.applications_count}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {new Date(project.created_at).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/projects/${project.id}/edit`}>
                        <Button variant="ghost" size="sm">編集</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}