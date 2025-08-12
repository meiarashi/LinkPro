"use client";

import { useState, useEffect } from 'react';
import { Plus, Filter, LayoutGrid, List } from 'lucide-react';
import { canTransitionTo } from '../../lib/project-status-utils';
import { Button } from '../ui/button';
import { ProjectCard } from './ProjectCard';
import { PROJECT_STATUS_CONFIG, KANBAN_STATUSES, ProjectWithStatus, ProjectStatus } from '../../types/project-status';
import { createClient } from '../../utils/supabase/client';
import { useToast } from '../ui/toast';

interface ProjectKanbanProps {
  projects: ProjectWithStatus[];
  onProjectUpdate?: () => void;
  viewMode?: 'kanban' | 'list';
}

export function ProjectKanban({ 
  projects: initialProjects, 
  onProjectUpdate,
  viewMode = 'kanban' 
}: ProjectKanbanProps) {
  const [projects, setProjects] = useState<ProjectWithStatus[]>(initialProjects);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const supabase = createClient();
  const { addToast } = useToast();

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  // プロジェクトをステータスごとにグループ化
  const projectsByStatus = KANBAN_STATUSES.reduce((acc, status) => {
    acc[status] = projects.filter(p => p.status === status);
    return acc;
  }, {} as Record<ProjectStatus, ProjectWithStatus[]>);

  // ステータス変更処理（ロールバック機能付き）
  const handleStatusChange = async (projectId: string, newStatus: string) => {
    // 変更前の状態を保存
    const originalProject = projects.find(p => p.id === projectId);
    if (!originalProject) return;
    
    // クライアント側で遷移可能性をチェック
    const canTransition = canTransitionTo(originalProject.status, newStatus as ProjectStatus);
    if (!canTransition) {
      addToast({
        message: `${PROJECT_STATUS_CONFIG[originalProject.status].label}から${PROJECT_STATUS_CONFIG[newStatus as ProjectStatus].label}への変更はできません`,
        type: "error"
      });
      return;
    }
    
    setIsUpdating(projectId);
    
    // 楽観的更新（即座にUIを更新）
    setProjects(prev => prev.map(p => 
      p.id === projectId 
        ? { ...p, status: newStatus as ProjectStatus }
        : p
    ));
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: newStatus,
          ...(newStatus === 'in_progress' && { started_at: new Date().toISOString() }),
          ...(newStatus === 'completed' && { completed_at: new Date().toISOString() }),
          ...(newStatus === 'cancelled' && { cancelled_at: new Date().toISOString() }),
          ...(newStatus === 'contracted' && { matched_at: new Date().toISOString() }),
        })
        .eq('id', projectId);

      if (error) throw error;

      addToast({
        message: "ステータスを更新しました",
        type: "success"
      });

      // 親コンポーネントに通知
      if (onProjectUpdate) {
        onProjectUpdate();
      }
    } catch (error: any) {
      // エラー時はロールバック
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? originalProject
          : p
      ));
      
      console.error('Error updating project status:', error);
      
      // エラーメッセージをユーザーフレンドリーに
      let errorMessage = "ステータスの更新に失敗しました";
      if (error.message?.includes('Invalid status transition')) {
        errorMessage = "この状態変更は許可されていません";
      } else if (error.message?.includes('Only project owner')) {
        errorMessage = "プロジェクトオーナーのみステータスを変更できます";
      } else if (error.message?.includes('Cannot start project without')) {
        errorMessage = "プロ人材を選定してからプロジェクトを開始してください";
      }
      
      addToast({
        message: errorMessage,
        type: "error"
      });
    } finally {
      setIsUpdating(null);
    }
  };

  // メッセージ画面への遷移
  const handleMessage = (projectId: string) => {
    window.location.href = `/projects/${projectId}?tab=messages`;
  };

  // カラムコンポーネント
  const Column = ({ status, projects }: { status: ProjectStatus; projects: ProjectWithStatus[] }) => {
    const config = PROJECT_STATUS_CONFIG[status];
    
    return (
      <div 
        className={`flex-1 min-w-[280px]`}
        role="region"
        aria-label={`${config.label}ステータスのプロジェクト`}
      >
        {/* カラムヘッダー */}
        <div className={`
          px-3 py-2 rounded-t-lg border-b-2
          ${config.bgColor} ${config.borderColor}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg" aria-hidden="true">{config.icon}</span>
              <h3 className={`font-medium text-sm ${config.color}`}>
                {config.label}
              </h3>
              <span 
                className={`
                  text-xs px-1.5 py-0.5 rounded-full
                  ${config.bgColor} ${config.color}
                `}
                aria-label={`${projects.length}件`}
              >
                {projects.length}
              </span>
            </div>
          </div>
        </div>

        {/* カード一覧 */}
        <div 
          className={`
            p-2 space-y-2 min-h-[400px] rounded-b-lg
            ${config.bgColor} bg-opacity-30
          `}
          role="list"
        >
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm" role="status">
              プロジェクトなし
            </div>
          ) : (
            projects.map(project => (
              <div key={project.id} role="listitem">
                <ProjectCard
                  project={project}
                  onStatusChange={handleStatusChange}
                  onMessage={handleMessage}
                  isDragging={isUpdating === project.id}
                />
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  // リストビューコンポーネント
  const ListView = () => {
    return (
      <div className="space-y-2">
        {KANBAN_STATUSES.map(status => {
          const config = PROJECT_STATUS_CONFIG[status];
          const statusProjects = projectsByStatus[status];
          
          if (statusProjects.length === 0) return null;
          
          return (
            <div key={status} className="space-y-2">
              <div className={`
                flex items-center gap-2 px-3 py-1.5 rounded-lg
                ${config.bgColor}
              `}>
                <span>{config.icon}</span>
                <h3 className={`font-medium text-sm ${config.color}`}>
                  {config.label} ({statusProjects.length})
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 px-2">
                {statusProjects.map(project => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onStatusChange={handleStatusChange}
                    onMessage={handleMessage}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* ヘッダー */}
      <div className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">
            プロジェクト管理
          </h2>
          <div className="flex items-center gap-2">
            {/* ビュー切り替え（将来的に実装） */}
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
              >
                <LayoutGrid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="h-7 px-2"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4">
        {viewMode === 'kanban' ? (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {KANBAN_STATUSES.map(status => (
              <Column
                key={status}
                status={status}
                projects={projectsByStatus[status]}
              />
            ))}
          </div>
        ) : (
          <ListView />
        )}
      </div>

      {/* プロジェクトがない場合 */}
      {projects.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg
              className="mx-auto h-12 w-12"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">
            プロジェクトがありません
          </h3>
          <p className="text-gray-500 mb-4">
            最初のプロジェクトを作成してAI人材を見つけましょう
          </p>
          <Button asChild>
            <a href="/projects/new">
              <Plus className="w-4 h-4 mr-2" />
              新規プロジェクト作成
            </a>
          </Button>
        </div>
      )}
    </div>
  );
}