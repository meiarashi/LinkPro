// プロジェクトステータス管理の型定義

export type ProjectStatus = 
  | 'draft'        // 下書き
  | 'recruiting'   // 募集中
  | 'executing'    // 実行中
  | 'completed'    // 完了
  | 'cancelled';   // キャンセル

export interface ProjectStatusConfig {
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, ProjectStatusConfig> = {
  draft: {
    label: '下書き',
    icon: '📝',
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200'
  },
  recruiting: {
    label: '募集中',
    icon: '📢',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  executing: {
    label: '実行中',
    icon: '🚀',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  completed: {
    label: '完了',
    icon: '✅',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  cancelled: {
    label: 'キャンセル',
    icon: '❌',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200'
  }
};

// カンバンビューで表示するステータス
export const KANBAN_STATUSES: ProjectStatus[] = [
  'draft',
  'recruiting',
  'executing',
  'completed',
  'cancelled'
];

// プロジェクトの拡張型
export interface ProjectWithStatus {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  budget: string | null;
  duration: string | null;
  status: ProjectStatus;
  matched_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  selected_pro_id: string | null;
  contract_amount: number | null;
  created_at: string;
  updated_at: string;
  
  // リレーション
  selected_pro?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
  applications_count?: number;
  recent_applicants?: Array<{
    id: string;
    full_name: string;
    avatar_url: string | null;
    applied_at: string;
  }>;
}

// ステータス変更の許可ルール
export const canTransitionTo = (
  currentStatus: ProjectStatus,
  newStatus: ProjectStatus
): boolean => {
  // すべてのステータス間の遷移を許可（自由に変更可能）
  // ユーザーが間違えても修正できるようにする
  return true;
};