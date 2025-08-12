"use client";

import { useState } from 'react';
import Link from 'next/link';
import { MoreVertical, MessageSquare, Users, Calendar, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
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

  // ステータスに応じた表示内容を取得
  const getStatusSpecificInfo = () => {
    switch (project.status) {
      case 'published':
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
      
      case 'reviewing':
        return (
          <div className="text-xs text-yellow-600">
            <Clock className="w-3 h-3 inline mr-1" />
            選定中
          </div>
        );

      case 'contracted':
        return project.matched_at ? (
          <div className="text-xs text-purple-600">
            <Calendar className="w-3 h-3 inline mr-1" />
            {formatDistanceToNow(new Date(project.matched_at), { 
              addSuffix: true, 
              locale: ja 
            })}に契約
          </div>
        ) : null;

      case 'in_progress':
        return (
          <div className="space-y-2">
            {/* 進捗バー */}
            <div className="w-full">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>進捗</span>
                <span>{project.progress_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div 
                  className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${project.progress_percentage}%` }}
                />
              </div>
            </div>
            {project.estimated_end_date && (
              <div className="text-xs text-gray-600">
                <Calendar className="w-3 h-3 inline mr-1" />
                予定: {new Date(project.estimated_end_date).toLocaleDateString('ja-JP')}
              </div>
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
    const actions = [];
    
    if (onMessage) {
      actions.push(
        <Button
          key="message"
          size="sm"
          variant="ghost"
          className="h-7 px-2"
          onClick={(e) => {
            e.preventDefault();
            onMessage(project.id);
          }}
        >
          <MessageSquare className="w-3 h-3" />
        </Button>
      );
    }

    if (project.status === 'published' && project.applications_count && project.applications_count > 0) {
      actions.push(
        <Link key="applications" href={`/projects/${project.id}?tab=applications`}>
          <Button size="sm" variant="ghost" className="h-7 px-2">
            <Users className="w-3 h-3" />
          </Button>
        </Link>
      );
    }

    return actions;
  };

  return (
    <div 
      className={`
        bg-white p-3 rounded-lg border transition-all
        ${isDragging 
          ? 'shadow-lg opacity-90 rotate-2 scale-105' 
          : 'shadow-sm hover:shadow-md'
        }
      `}
    >
      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-2">
        <Link 
          href={`/projects/${project.id}`}
          className="flex-1 min-w-0"
        >
          <h4 className="font-medium text-sm line-clamp-2 hover:text-blue-600 transition-colors">
            {project.title}
          </h4>
        </Link>
        
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
            
            {onStatusChange && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onStatusChange(project.id, 'in_progress')}
                  disabled={project.status !== 'contracted'}
                >
                  開始する
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => onStatusChange(project.id, 'completed')}
                  disabled={project.status !== 'in_review'}
                >
                  完了確定
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Pro情報（契約済み以降） */}
      {project.selected_pro && ['contracted', 'in_progress', 'in_review', 'completed'].includes(project.status) && (
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
      {getQuickActions().length > 0 && (
        <div className="mt-2 pt-2 border-t flex gap-1">
          {getQuickActions()}
        </div>
      )}
    </div>
  );
}