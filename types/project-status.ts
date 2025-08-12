// プロジェクトステータス管理の型定義

export type ProjectStatus = 
  | 'draft'        // 下書き
  | 'recruiting'   // 募集中（旧: published + reviewing）
  | 'contracted'   // 契約済み（開始前）
  | 'in_progress'  // 進行中
  | 'in_review'    // 完了確認中
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
  contracted: {
    label: '契約済',
    icon: '🤝',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200'
  },
  in_progress: {
    label: '進行中',
    icon: '🚀',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
    borderColor: 'border-indigo-200'
  },
  in_review: {
    label: '確認中',
    icon: '👀',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
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
  'contracted',
  'in_progress',
  'in_review',
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
  const transitions: Record<ProjectStatus, ProjectStatus[]> = {
    draft: ['recruiting', 'cancelled'],
    recruiting: ['draft', 'contracted', 'cancelled'],  // 下書きに戻せる
    contracted: ['in_progress', 'cancelled'],  // 契約後は下書きに戻せない
    in_progress: ['in_review', 'cancelled'],
    in_review: ['completed', 'in_progress', 'cancelled'],
    completed: [], // 完了後は変更不可
    cancelled: [] // キャンセル後も変更不可
  };
  
  return transitions[currentStatus]?.includes(newStatus) ?? false;
};