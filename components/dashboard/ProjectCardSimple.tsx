"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { MoreVertical, MessageSquare, Users, Bell, Clock, AlertCircle } from 'lucide-react';
import { PROJECT_STATUS_CONFIG } from '../../types/project-status';
import { Button } from '../ui/button';
import { Avatar } from '../ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '../ui/dropdown-menu';
import { ProjectWithStatus } from '../../types/project-status';

interface ProjectCardProps {
  project: ProjectWithStatus;
  onStatusChange?: (projectId: string, newStatus: string) => void;
  onMessage?: (projectId: string) => void;
  isDragging?: boolean;
  unreadCount?: number;  // 新着メッセージ数
  newApplications?: number;  // 新着応募数
}

export function ProjectCard({ 
  project, 
  onStatusChange,
  onMessage,
  isDragging = false,
  unreadCount = 0,
  newApplications = 0
}: ProjectCardProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // 新着があるかどうか
  const hasNotifications = unreadCount > 0 || newApplications > 0;

  return (
    <div 
      className={`
        bg-white p-3 rounded-lg border transition-all relative
        ${isDragging 
          ? 'shadow-lg opacity-90 rotate-1 scale-105' 
          : 'shadow-sm hover:shadow-md cursor-move'
        }
        ${hasNotifications ? 'border-orange-300' : ''}
      `}
    >
      {/* 新着インジケーター（カード全体） */}
      {hasNotifications && (
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
      )}

      {/* ヘッダー */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1 min-w-0">
          <Link href={`/projects/${project.id}`}>
            <h4 className="font-medium text-sm line-clamp-2 hover:text-blue-600 transition-colors">
              {project.title}
            </h4>
          </Link>
        </div>
        
        <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-6 w-6 p-0 ml-2"
              onClick={(e) => e.stopPropagation()}
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
                <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                  ステータスを変更
                </div>
                {['draft', 'recruiting', 'executing', 'completed', 'cancelled']
                  .filter(s => s !== project.status)
                  .map((status) => {
                    const config = PROJECT_STATUS_CONFIG[status as keyof typeof PROJECT_STATUS_CONFIG];
                    return (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => onStatusChange(project.id, status)}
                        className="flex items-center gap-2"
                      >
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

      {/* 主要情報 */}
      <div className="space-y-2">
        {/* Pro情報（実行中以降） */}
        {project.selected_pro && ['executing', 'completed'].includes(project.status) && (
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <Avatar 
              src={project.selected_pro.avatar_url}
              alt={project.selected_pro.full_name}
              fallbackName={project.selected_pro.full_name}
              size="xs"
            />
            <span className="truncate">{project.selected_pro.full_name}</span>
          </div>
        )}

        {/* 新着通知 */}
        {hasNotifications && (
          <div className="flex gap-2">
            {newApplications > 0 && (
              <div className="flex items-center gap-1 bg-orange-50 text-orange-600 px-2 py-1 rounded-full">
                <Users className="w-3 h-3" />
                <span className="text-xs font-medium">+{newApplications}名応募</span>
              </div>
            )}
            {unreadCount > 0 && (
              <div className="flex items-center gap-1 bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                <MessageSquare className="w-3 h-3" />
                <span className="text-xs font-medium">{unreadCount}</span>
              </div>
            )}
          </div>
        )}

        {/* 応募者数（募集中のみ、新着とは別に常時表示） */}
        {project.status === 'recruiting' && project.applications_count !== undefined && (
          <div className="text-xs text-gray-600">
            <Users className="w-3 h-3 inline mr-1" />
            合計{project.applications_count}名応募中
          </div>
        )}

        {/* 期間と予算（コンパクトに） */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          {project.duration && (
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              {project.duration}
            </span>
          )}
          {project.budget && (
            <span className="truncate">{project.budget}</span>
          )}
        </div>
      </div>

      {/* クイックアクセスボタン（複数表示） */}
      <div className="mt-2 pt-2 border-t space-y-1">
        {/* 新着がある場合は強調表示 */}
        {newApplications > 0 && (
          <Link href={`/projects/${project.id}?tab=applications`} className="block">
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full h-7 text-xs text-orange-600 hover:bg-orange-50 justify-start"
            >
              <AlertCircle className="w-3 h-3 mr-1.5 flex-shrink-0" />
              <span className="truncate">新着{newApplications}件！ 応募を確認</span>
            </Button>
          </Link>
        )}
        
        {unreadCount > 0 && (
          <Link href={`/messages?project=${project.id}`} className="block">
            <Button 
              size="sm" 
              variant="outline" 
              className="w-full h-7 text-xs text-blue-600 hover:bg-blue-50 justify-start"
            >
              <Bell className="w-3 h-3 mr-1.5 flex-shrink-0" />
              <span className="truncate">未読{unreadCount}件のメッセージ</span>
            </Button>
          </Link>
        )}

        {/* 常時表示のクイックアクセス */}
        <div className="flex gap-1">
          {/* 応募者一覧（募集中の場合） */}
          {project.status === 'recruiting' && (
            <Link href={`/projects/${project.id}?tab=applications`} className="flex-1">
              <Button 
                size="sm" 
                variant="ghost" 
                className="w-full h-7 text-xs hover:bg-gray-50 px-2"
                title={`応募者一覧${project.applications_count ? ` (${project.applications_count}名)` : ''}`}
              >
                <Users className="w-3 h-3 mr-1" />
                <span className="truncate">
                  {project.applications_count ? `${project.applications_count}名` : '応募'}
                </span>
              </Button>
            </Link>
          )}
          
          {/* メッセージ */}
          {['recruiting', 'executing'].includes(project.status) && (
            <Link href={`/messages?project=${project.id}`} className="flex-1">
              <Button 
                size="sm" 
                variant="ghost" 
                className="w-full h-7 text-xs hover:bg-gray-50 px-2"
                title="メッセージ一覧"
              >
                <MessageSquare className="w-3 h-3 mr-1" />
                <span className="truncate">メッセージ</span>
              </Button>
            </Link>
          )}
          
          {/* 詳細 */}
          <Link href={`/projects/${project.id}`} className="flex-1">
            <Button 
              size="sm" 
              variant="ghost" 
              className="w-full h-7 text-xs hover:bg-gray-50 px-2"
              title="プロジェクト詳細"
            >
              詳細
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}