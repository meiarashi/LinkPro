"use client";

import { useState, useEffect } from 'react';
import { Plus, Filter, LayoutGrid, List } from 'lucide-react';
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

  // ステータス変更処理
  const handleStatusChange = async (projectId: string, newStatus: string) => {
    setIsUpdating(projectId);
    
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: newStatus,
          ...(newStatus === 'in_progress' && { started_at: new Date().toISOString() }),
          ...(newStatus === 'completed' && { completed_at: new Date().toISOString() }),
          ...(newStatus === 'cancelled' && { cancelled_at: new Date().toISOString() }),
        })
        .eq('id', projectId);

      if (error) throw error;

      // ローカル状態を更新
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? { ...p, status: newStatus as ProjectStatus }
          : p
      ));

      addToast({
        message: "ステータスを更新しました",
        type: "success"
      });

      // 親コンポーネントに通知
      if (onProjectUpdate) {
        onProjectUpdate();
      }
    } catch (error) {
      console.error('Error updating project status:', error);
      addToast({
        message: "ステータスの更新に失敗しました",
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
      <div className={`flex-1 min-w-[280px]`}>
        {/* カラムヘッダー */}
        <div className={`
          px-3 py-2 rounded-t-lg border-b-2
          ${config.bgColor} ${config.borderColor}
        `}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{config.icon}</span>
              <h3 className={`font-medium text-sm ${config.color}`}>
                {config.label}
              </h3>
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${config.bgColor} ${config.color}
              `}>
                {projects.length}
              </span>
            </div>
          </div>
        </div>

        {/* カード一覧 */}
        <div className={`
          p-2 space-y-2 min-h-[400px] rounded-b-lg
          ${config.bgColor} bg-opacity-30
        `}>
          {projects.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              プロジェクトなし
            </div>
          ) : (
            projects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onStatusChange={handleStatusChange}
                onMessage={handleMessage}
                isDragging={isUpdating === project.id}
              />
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