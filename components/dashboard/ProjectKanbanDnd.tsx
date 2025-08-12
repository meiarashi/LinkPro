"use client";

import { useState, useEffect, useId } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult, resetServerContext } from 'react-beautiful-dnd';
import { Plus, Filter, LayoutGrid, List } from 'lucide-react';
import { Button } from '../ui/button';
import { ProjectCard } from './ProjectCard';
import { PROJECT_STATUS_CONFIG, KANBAN_STATUSES, ProjectWithStatus, ProjectStatus } from '../../types/project-status';
import { createClient } from '../../utils/supabase/client';
import { useToast } from '../ui/toast';
import { canTransitionTo } from '../../lib/project-status-utils';

interface ProjectKanbanProps {
  projects: ProjectWithStatus[];
  onProjectUpdate?: () => void;
  viewMode?: 'kanban' | 'list';
}

// StrictMode対応のためresetServerContextを呼び出し
resetServerContext();

export const ProjectKanban = ({ 
  projects: initialProjects, 
  onProjectUpdate,
  viewMode = 'kanban' 
}: ProjectKanbanProps) => {
  const [projects, setProjects] = useState<ProjectWithStatus[]>(initialProjects);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const uniqueId = useId();
  const supabase = createClient();
  const { addToast } = useToast();

  useEffect(() => {
    console.log('[DnD Debug] Component mounting');
    setIsMounted(true);
    return () => {
      console.log('[DnD Debug] Component unmounting');
      setIsMounted(false);
    };
  }, []);

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  // プロジェクトをステータスごとにグループ化
  const projectsByStatus = KANBAN_STATUSES.reduce((acc, status) => {
    acc[status] = projects.filter(p => p.status === status);
    return acc;
  }, {} as Record<ProjectStatus, ProjectWithStatus[]>);

  // ドラッグ終了時の処理
  const handleDragEnd = async (result: DropResult) => {
    console.log('[DnD Debug] handleDragEnd called with result:', result);
    setIsDragging(false);
    
    if (!result.destination) {
      console.log('[DnD Debug] No destination, dropping outside');
      return;
    }

    // ステータスを取得
    const sourceStatus = result.source.droppableId as ProjectStatus;
    const destinationStatus = result.destination.droppableId as ProjectStatus;
    
    console.log('[DnD Debug] Source status:', sourceStatus);
    console.log('[DnD Debug] Destination status:', destinationStatus);
    
    // 同じカラム内での移動は無視
    if (sourceStatus === destinationStatus) {
      return;
    }

    // プロジェクトを取得
    const projectId = result.draggableId;
    const project = projects.find(p => p.id === projectId);
    
    if (!project) {
      return;
    }

    // ステータス遷移が可能かチェック
    if (!canTransitionTo(sourceStatus, destinationStatus)) {
      addToast({
        message: `${PROJECT_STATUS_CONFIG[sourceStatus].label}から${PROJECT_STATUS_CONFIG[destinationStatus].label}への変更はできません`,
        type: "error"
      });
      return;
    }

    // 楽観的更新
    const updatedProjects = projects.map(p => 
      p.id === projectId 
        ? { ...p, status: destinationStatus }
        : p
    );
    setProjects(updatedProjects);
    setIsUpdating(projectId);

    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: destinationStatus,
          ...(destinationStatus === 'executing' && { started_at: new Date().toISOString(), matched_at: new Date().toISOString() }),
          ...(destinationStatus === 'completed' && { completed_at: new Date().toISOString() }),
          ...(destinationStatus === 'cancelled' && { cancelled_at: new Date().toISOString() }),
        })
        .eq('id', projectId);

      if (error) throw error;

      addToast({
        message: "ステータスを更新しました",
        type: "success"
      });

      if (onProjectUpdate) {
        onProjectUpdate();
      }
    } catch (error: any) {
      // エラー時はロールバック
      setProjects(projects);
      
      console.error('Error updating project status:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      
      let errorMessage = "ステータスの更新に失敗しました";
      if (error.message?.includes('Invalid status transition')) {
        errorMessage = "この状態変更は許可されていません";
      } else if (error.message?.includes('Only project owner')) {
        errorMessage = "プロジェクトオーナーのみステータスを変更できます";
      } else if (error.message) {
        errorMessage = `エラー: ${error.message}`;
      }
      
      addToast({
        message: errorMessage,
        type: "error"
      });
    } finally {
      setIsUpdating(null);
    }
  };

  // ステータス変更処理（メニューから）
  const handleStatusChange = async (projectId: string, newStatus: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    if (!canTransitionTo(project.status, newStatus as ProjectStatus)) {
      addToast({
        message: `${PROJECT_STATUS_CONFIG[project.status].label}から${PROJECT_STATUS_CONFIG[newStatus as ProjectStatus].label}への変更はできません`,
        type: "error"
      });
      return;
    }
    
    setIsUpdating(projectId);
    
    // 楽観的更新
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
          ...(newStatus === 'executing' && { started_at: new Date().toISOString(), matched_at: new Date().toISOString() }),
          ...(newStatus === 'completed' && { completed_at: new Date().toISOString() }),
          ...(newStatus === 'cancelled' && { cancelled_at: new Date().toISOString() }),
        })
        .eq('id', projectId);

      if (error) throw error;

      addToast({
        message: "ステータスを更新しました",
        type: "success"
      });

      if (onProjectUpdate) {
        onProjectUpdate();
      }
    } catch (error: any) {
      // エラー時はロールバック
      setProjects(prev => prev.map(p => 
        p.id === projectId 
          ? project
          : p
      ));
      
      console.error('Error updating project status:', error);
      console.error('Error details:', error.message, error.details, error.hint);
      
      let errorMessage = "ステータスの更新に失敗しました";
      if (error.message) {
        errorMessage = `エラー: ${error.message}`;
      }
      
      addToast({
        message: errorMessage,
        type: "error"
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleMessage = (projectId: string) => {
    window.location.href = `/projects/${projectId}?tab=messages`;
  };

  // カラムコンポーネント
  const Column = ({ status, projects }: { status: ProjectStatus; projects: ProjectWithStatus[] }) => {
    const config = PROJECT_STATUS_CONFIG[status];
    
    return (
      <div className={`flex-1 min-w-[240px] max-w-[320px]`}>
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

        {/* カード一覧（ドロップ可能エリア） */}
        <Droppable droppableId={status} type="CARD">
          {(provided, snapshot) => (
            <div 
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`
                p-2 space-y-2 min-h-[400px] rounded-b-lg transition-colors
                ${config.bgColor} bg-opacity-30
                ${snapshot.isDraggingOver ? 'bg-opacity-50 ring-2 ring-blue-500 ring-opacity-50' : ''}
              `}
              role="list"
            >
              {projects.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm" role="status">
                  プロジェクトなし
                </div>
              ) : (
                projects.map((project, index) => (
                  <Draggable 
                    key={project.id} 
                    draggableId={project.id} 
                    index={index}
                    isDragDisabled={isUpdating === project.id}
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        style={{
                          ...provided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
                        }}
                        role="listitem"
                      >
                        <ProjectCard
                          project={project}
                          onStatusChange={handleStatusChange}
                          onMessage={handleMessage}
                          isDragging={snapshot.isDragging || isUpdating === project.id}
                        />
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
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
            <div className="text-xs text-gray-500">
              {isDragging ? 'ドラッグ中...' : 'カードをドラッグして移動'}
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4">
        {isMounted ? (
          <DragDropContext 
            onDragEnd={handleDragEnd}
            onDragStart={() => {
              console.log('[DnD Debug] Drag started');
              setIsDragging(true);
            }}
            onDragUpdate={(update) => {
              console.log('[DnD Debug] Drag update:', update);
            }}
          >
            <div className="flex gap-3 justify-center pb-4">
              {KANBAN_STATUSES.map(status => (
                <Column
                  key={status}
                  status={status}
                  projects={projectsByStatus[status]}
                />
              ))}
            </div>
          </DragDropContext>
        ) : (
          <div className="flex gap-3 justify-center pb-4">
            {KANBAN_STATUSES.map(status => (
              <div key={status} className="flex-1 min-w-[240px] max-w-[320px]">
                <div className="h-10 bg-gray-200 rounded-t-lg mb-2 animate-pulse"></div>
                <div className="h-96 bg-gray-100 rounded-b-lg animate-pulse"></div>
              </div>
            ))}
          </div>
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
};