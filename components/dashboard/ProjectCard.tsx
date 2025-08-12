"use client";

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { MoreVertical, MessageSquare, Users, Calendar, DollarSign, TrendingUp, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import { getNextPossibleStatuses } from '../../lib/project-status-utils';
import { PROJECT_STATUS_CONFIG } from '../../types/project-status';
import { Button } from '../ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { ProjectWithStatus } from '../../types/project-status';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface ProjectCardProps {
  project: ProjectWithStatus;
  onStatusChange?: (projectId: string, newStatus: string) => void;
  onMessage?: (projectId: string) => void;
  isDragging?: boolean;
}

export function ProjectCard({ 
  project, 
  onStatusChange,
  onMessage,
  isDragging = false 
}: ProjectCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // キーボード操作のハンドラ
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        setIsMenuOpen(true);
      } else {
        window.location.href = `/projects/${project.id}`;
      }
    } else if (e.key === 'Escape') {
      setIsMenuOpen(false);
    }
  };

  // ステータスに応じた表示内容を取得
  const getStatusSpecificInfo = () => {
    switch (project.status) {
      case 'recruiting':
        return (
          <>
            {project.applications_count !== undefined && project.applications_count > 0 && (
              <div className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full w-fit">
                <Users className="w-3 h-3" />
                <span>{project.applications_count}名応募</span>
              </div>
            )}
          </>
        );


      case 'executing':
        return (
          <div className="text-xs text-indigo-600">
            <Clock className="w-3 h-3 inline mr-1" />
            実行中
            {project.started_at && (
              <span className="ml-2 text-gray-500">
                {formatDistanceToNow(new Date(project.started_at), { 
                  addSuffix: true, 
                  locale: ja 
                })}に開始
              </span>
            )}
          </div>
        );

      case 'completed':
        return (
          <div className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3 h-3" />
            {project.completed_at && 
              new Date(project.completed_at).toLocaleDateString('ja-JP')
            }
          </div>
        );

      default:
        return null;
    }
  };

  // クイックアクション
  const getQuickActions = () => {
    // ステータスに応じて最も重要なアクション1つだけを表示
    
    // 募集中：応募者の確認が最重要
    if (project.status === 'recruiting' && project.applications_count && project.applications_count > 0) {
      return (
        <Link href={`/projects/${project.id}?tab=applications`}>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 px-3 flex items-center gap-1.5 text-blue-600 hover:bg-blue-50"
            title={`応募者を確認（${project.applications_count}名）`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">{project.applications_count}名の応募</span>
          </Button>
        </Link>
      );
    }
    
    // 実行中：進捗確認が最重要
    if (project.status === 'executing') {
      return (
        <Link href={`/projects/${project.id}`}>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 px-3 flex items-center gap-1.5 text-green-600 hover:bg-green-50"
            title="進捗を確認"
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-xs font-medium">進捗確認</span>
          </Button>
        </Link>
      );
    }
    
    // その他：詳細を見る
    return (
      <Link href={`/projects/${project.id}`}>
        <Button 
          size="sm" 
          variant="ghost" 
          className="h-7 px-3 text-xs"
          title="プロジェクト詳細"
        >
          詳細を見る
        </Button>
      </Link>
    );
  };

  return (
    <div 
      className={`
        bg-white p-2.5 rounded-lg border transition-all
        ${isDragging 
          ? 'shadow-lg opacity-90 rotate-2 scale-105' 
          : 'shadow-sm hover:shadow-md'
        }
      `}
    >
      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          {/* ステータスバッジ */}
          <div className="flex items-center gap-2 mb-1">
            <span className={`
              inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium
              ${PROJECT_STATUS_CONFIG[project.status].bgColor} ${PROJECT_STATUS_CONFIG[project.status].color}
            `}>
              <span>{PROJECT_STATUS_CONFIG[project.status].icon}</span>
              {PROJECT_STATUS_CONFIG[project.status].label}
            </span>
          </div>
          <Link href={`/projects/${project.id}`}>
            <h4 className="font-medium text-sm line-clamp-1 hover:text-blue-600 transition-colors">
              {project.title}
            </h4>
          </Link>
        </div>
        
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-6 w-6 p-0"
            >
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}`}>
                詳細を見る
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/projects/${project.id}/edit`}>
                編集
              </Link>
            </DropdownMenuItem>
            
            {onStatusChange && getNextPossibleStatuses(project.status).length > 0 && (
              <>
                <DropdownMenuSeparator />
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                  ステータスを変更
                </div>
                {getNextPossibleStatuses(project.status).map((nextStatus) => {
                  const config = PROJECT_STATUS_CONFIG[nextStatus];
                  return (
                    <DropdownMenuItem
                      key={nextStatus}
                      onClick={() => onStatusChange(project.id, nextStatus)}
                      className="flex items-center gap-2"
                    >
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-sm">{config.icon}</span>
                      <span>{config.label}へ</span>
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Pro情報（実行中以降） */}
      {project.selected_pro && ['executing', 'completed'].includes(project.status) && (
        <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
          <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
            {project.selected_pro.avatar_url ? (
              <img 
                src={project.selected_pro.avatar_url} 
                alt={project.selected_pro.full_name}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <span className="text-[10px]">
                {project.selected_pro.full_name.slice(0, 1)}
              </span>
            )}
          </div>
          <span className="truncate">{project.selected_pro.full_name}</span>
        </div>
      )}

      {/* ステータス別情報 */}
      <div className="mb-2">
        {getStatusSpecificInfo()}
      </div>

      {/* メタ情報 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-3">
          {project.budget && (
            <span className="flex items-center gap-0.5">
              <DollarSign className="w-3 h-3" />
              {project.budget}
            </span>
          )}
          {project.duration && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {project.duration}
            </span>
          )}
        </div>
      </div>

      {/* クイックアクション */}
      <div className="mt-1.5 pt-1.5 border-t">
        {getQuickActions()}
      </div>
    </div>
  );
}