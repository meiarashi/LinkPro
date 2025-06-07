"use client";

import { useState } from "react";
import Link from 'next/link';
import { Button } from "../../components/ui/button";
import { Plus, FolderOpen, Users, MessageSquare, AlertCircle } from 'lucide-react';

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
}

interface ClientDashboardProps {
  projects: Project[];
  recentApplications: Application[];
  projectsLoading: boolean;
}

export default function ClientDashboard({ 
  projects, 
  recentApplications, 
  projectsLoading 
}: ClientDashboardProps) {
  
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
          <Link href="/projects/new">
            <Button className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              新規プロジェクト作成
            </Button>
          </Link>
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
                <p className="text-2xl font-bold text-blue-600">{recentApplications.length}</p>
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
            新着応募
          </h2>
          <div className="space-y-3">
            {recentApplications.map((application) => (
              <div key={application.id} className="border-l-4 border-blue-500 pl-4 py-2">
                <p className="font-medium text-gray-800">
                  {application.pm_profile?.full_name || 'PM'} さんからの応募
                </p>
                <p className="text-sm text-gray-600 mt-1">{application.message}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(application.created_at).toLocaleDateString('ja-JP')}
                </p>
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