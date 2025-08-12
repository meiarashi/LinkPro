"use client";

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  DropAnimation,
  defaultDropAnimationSideEffects,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
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

// ドラッグ可能なカードコンポーネント
function SortableProjectCard({ project, onStatusChange, onMessage, isDisabled }: {
  project: ProjectWithStatus;
  onStatusChange: (projectId: string, newStatus: string) => Promise<void>;
  onMessage: (projectId: string) => void;
  isDisabled: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: project.id,
    disabled: isDisabled,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProjectCard
        project={project}
        onStatusChange={onStatusChange}
        onMessage={onMessage}
        isDragging={isDragging}
      />
    </div>
  );
}

// ドロップ可能なカラムコンポーネント
function DroppableColumn({ status, projects, onStatusChange, onMessage, isUpdating }: {
  status: ProjectStatus;
  projects: ProjectWithStatus[];
  onStatusChange: (projectId: string, newStatus: string) => Promise<void>;
  onMessage: (projectId: string) => void;
  isUpdating: string | null;
}) {
  const config = PROJECT_STATUS_CONFIG[status];
  const {
    setNodeRef,
    isOver,
  } = useSortable({
    id: status,
    data: {
      type: 'column',
      status,
    },
  });

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

      {/* カード一覧 */}
      <div
        ref={setNodeRef}
        className={`
          p-2 space-y-2 min-h-[400px] rounded-b-lg transition-colors
          ${config.bgColor} bg-opacity-30
          ${isOver ? 'bg-opacity-50 ring-2 ring-blue-500 ring-opacity-50' : ''}
        `}
      >
        <SortableContext
          items={projects.map(p => p.id)}
          strategy={verticalListSortingStrategy}
        >
          {projects.map((project) => (
            <SortableProjectCard
              key={project.id}
              project={project}
              onStatusChange={onStatusChange}
              onMessage={onMessage}
              isDisabled={isUpdating === project.id}
            />
          ))}
        </SortableContext>
        
        {projects.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            プロジェクトなし
          </div>
        )}
      </div>
    </div>
  );
}

const dropAnimation: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};

export const ProjectKanban = ({ 
  projects: initialProjects, 
  onProjectUpdate,
  viewMode = 'kanban' 
}: ProjectKanbanProps) => {
  const [projects, setProjects] = useState<ProjectWithStatus[]>(initialProjects);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const supabase = createClient();
  const { addToast } = useToast();

  useEffect(() => {
    setProjects(initialProjects);
  }, [initialProjects]);

  // センサーの設定（マウスとキーボード）
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // プロジェクトをステータスごとにグループ化
  const projectsByStatus = KANBAN_STATUSES.reduce((acc, status) => {
    acc[status] = projects.filter(p => p.status === status);
    return acc;
  }, {} as Record<ProjectStatus, ProjectWithStatus[]>);

  // ドラッグ開始時
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // ドラッグ終了時
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeProject = projects.find(p => p.id === active.id);
    if (!activeProject) return;

    // カラムにドロップされた場合
    let newStatus: ProjectStatus | undefined;
    
    if (over.data.current?.type === 'column') {
      newStatus = over.data.current.status as ProjectStatus;
    } else {
      // 他のプロジェクトの上にドロップされた場合、そのプロジェクトのステータスを取得
      const overProject = projects.find(p => p.id === over.id);
      if (overProject) {
        newStatus = overProject.status;
      }
    }

    if (!newStatus || newStatus === activeProject.status) return;

    // ステータス遷移の制限は撤廃されたのでチェック不要

    // 楽観的更新
    const updatedProjects = projects.map(p => 
      p.id === activeProject.id 
        ? { ...p, status: newStatus }
        : p
    );
    setProjects(updatedProjects);
    setIsUpdating(activeProject.id);

    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          status: newStatus,
          ...(newStatus === 'executing' && { started_at: new Date().toISOString(), matched_at: new Date().toISOString() }),
          ...(newStatus === 'completed' && { completed_at: new Date().toISOString() }),
          ...(newStatus === 'cancelled' && { cancelled_at: new Date().toISOString() }),
        })
        .eq('id', activeProject.id);

      if (error) throw error;

      // 成功トーストは表示しない（邪魔になるため）

      if (onProjectUpdate) {
        onProjectUpdate();
      }
    } catch (error: any) {
      // エラー時はロールバック
      setProjects(projects);
      
      console.error('Error updating project status:', error);
      
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

  // ステータス変更処理（メニューから）
  const handleStatusChange = async (projectId: string, newStatus: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    
    // ステータス遷移の制限は撤廃されたのでチェック不要
    
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

      // 成功トーストは表示しない（邪魔になるため）

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

  const activeProject = activeId ? projects.find(p => p.id === activeId) : null;

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
              カードをドラッグして移動
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ */}
      <div className="p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 justify-center pb-4">
            <SortableContext
              items={KANBAN_STATUSES}
              strategy={verticalListSortingStrategy}
            >
              {KANBAN_STATUSES.map(status => (
                <DroppableColumn
                  key={status}
                  status={status}
                  projects={projectsByStatus[status]}
                  onStatusChange={handleStatusChange}
                  onMessage={handleMessage}
                  isUpdating={isUpdating}
                />
              ))}
            </SortableContext>
          </div>

          <DragOverlay dropAnimation={dropAnimation}>
            {activeProject ? (
              <div className="opacity-80">
                <ProjectCard
                  project={activeProject}
                  onStatusChange={handleStatusChange}
                  onMessage={handleMessage}
                  isDragging={true}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
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