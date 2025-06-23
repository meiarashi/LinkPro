"use client";

import Link from 'next/link';
import { Button } from "../../components/ui/button";
import { FolderOpen, MessageSquare, Clock, CheckCircle } from 'lucide-react';

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
  profile_details?: any;
  rate_info?: any;
}

interface Application {
  id: string;
  project_id: string;
  pro_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  project?: {
    id: string;
    title: string;
    budget: string | null;
    duration: string | null;
    status: string;
    client_id: string;
  };
}

interface ProDashboardProps {
  profile: Profile;
  proApplications: Application[];
  projectsLoading: boolean;
  unreadMessageCount?: number;
}

export default function ProDashboard({ 
  profile, 
  proApplications, 
  projectsLoading,
  unreadMessageCount = 0 
}: ProDashboardProps) {
  
  return (
    <div className="space-y-6">
      {/* ヘッダーセクション */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Proダッシュボード</h1>
            <p className="text-gray-600 mt-1">プロジェクトへの応募状況を管理</p>
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
            <Link href="/projects">
              <Button className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                プロジェクトを探す
              </Button>
            </Link>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">応募中</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {proApplications.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">承認済み</p>
                <p className="text-2xl font-bold text-green-600">
                  {proApplications.filter(a => a.status === 'accepted').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">総応募数</p>
                <p className="text-2xl font-bold text-gray-800">{proApplications.length}</p>
              </div>
              <MessageSquare className="w-8 h-8 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* プロフィール完成度 */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">プロフィール状況</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">基本情報</span>
            <span className={`text-sm ${profile.full_name ? 'text-green-600' : 'text-gray-400'}`}>
              {profile.full_name ? '✓ 完了' : '未設定'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">スキル情報</span>
            <span className={`text-sm ${profile.profile_details?.skills?.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {profile.profile_details?.skills?.length > 0 ? '✓ 完了' : '未設定'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">単価情報</span>
            <span className={`text-sm ${profile.rate_info?.hourly_rate ? 'text-green-600' : 'text-gray-400'}`}>
              {profile.rate_info?.hourly_rate ? '✓ 完了' : '未設定'}
            </span>
          </div>
        </div>
        <Link href="/profile/edit">
          <Button variant="outline" size="sm" className="mt-4 w-full">
            プロフィールを編集
          </Button>
        </Link>
      </div>

      {/* 応募一覧 */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">応募履歴</h2>
        {projectsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : proApplications.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">まだ応募がありません</p>
            <Link href="/projects">
              <Button variant="link" className="mt-2">
                プロジェクトを探す
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {proApplications.map((application) => (
              <div key={application.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link 
                      href={`/projects/${application.project?.id}`}
                      className="font-medium text-gray-800 hover:text-blue-600"
                    >
                      {application.project?.title || 'プロジェクト'}
                    </Link>
                    <div className="mt-1 text-sm text-gray-600">
                      {application.project?.budget && (
                        <span className="mr-4">予算: {application.project.budget}</span>
                      )}
                      {application.project?.duration && (
                        <span>期間: {application.project.duration}</span>
                      )}
                    </div>
                    {application.message && (
                      <p className="mt-2 text-sm text-gray-600">{application.message}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      応募日: {new Date(application.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="ml-4">
                    {application.status === 'pending' && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                        審査中
                      </span>
                    )}
                    {application.status === 'accepted' && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        承認済み
                      </span>
                    )}
                    {application.status === 'rejected' && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        却下
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}