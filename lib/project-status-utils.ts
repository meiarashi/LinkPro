import { ProjectStatus } from '../types/project-status';

/**
 * ステータス遷移が可能かどうかを判定
 * @param from 現在のステータス
 * @param to 変更先のステータス
 * @returns 遷移可能な場合true
 */
export function canTransitionTo(from: ProjectStatus, to: ProjectStatus): boolean {
  // 同じステータスへの変更は許可
  if (from === to) return true;
  
  const transitions: Record<ProjectStatus, ProjectStatus[]> = {
    'draft': ['published', 'cancelled'],
    'published': ['reviewing', 'cancelled'],
    'reviewing': ['contracted', 'published', 'cancelled'],
    'contracted': ['in_progress', 'cancelled'],
    'in_progress': ['in_review', 'cancelled'],
    'in_review': ['completed', 'in_progress', 'cancelled'],
    'completed': [], // 完了からは変更不可
    'cancelled': [], // キャンセルからは変更不可
  };
  
  return transitions[from]?.includes(to) ?? false;
}

/**
 * 次に可能なステータスのリストを取得
 * @param currentStatus 現在のステータス
 * @returns 遷移可能なステータスの配列
 */
export function getNextPossibleStatuses(currentStatus: ProjectStatus): ProjectStatus[] {
  const transitions: Record<ProjectStatus, ProjectStatus[]> = {
    'draft': ['published', 'cancelled'],
    'published': ['reviewing', 'cancelled'],
    'reviewing': ['contracted', 'published', 'cancelled'],
    'contracted': ['in_progress', 'cancelled'],
    'in_progress': ['in_review', 'cancelled'],
    'in_review': ['completed', 'in_progress', 'cancelled'],
    'completed': [],
    'cancelled': [],
  };
  
  return transitions[currentStatus] ?? [];
}

/**
 * ステータス変更に必要な条件をチェック
 * @param project プロジェクトデータ
 * @param newStatus 変更先のステータス
 * @returns エラーメッセージまたはnull
 */
export function validateStatusChange(
  project: { 
    status: ProjectStatus; 
    selected_pro_id?: string | null;
    progress_percentage?: number;
  }, 
  newStatus: ProjectStatus
): string | null {
  // 基本的な遷移可能性チェック
  if (!canTransitionTo(project.status, newStatus)) {
    return `${project.status}から${newStatus}への変更はできません`;
  }
  
  // 特定の条件チェック
  if (newStatus === 'in_progress' && !project.selected_pro_id) {
    return 'プロジェクトを開始するには、まずプロ人材を選定してください';
  }
  
  if (newStatus === 'completed' && project.progress_percentage !== undefined && project.progress_percentage < 90) {
    return 'プロジェクトを完了するには、進捗が90%以上である必要があります';
  }
  
  return null;
}

/**
 * ステータスの進行度を数値で取得（0-100）
 * @param status ステータス
 * @returns 進行度（0-100）
 */
export function getStatusProgress(status: ProjectStatus): number {
  const progressMap: Record<ProjectStatus, number> = {
    'draft': 0,
    'published': 10,
    'reviewing': 20,
    'contracted': 30,
    'in_progress': 50,
    'in_review': 90,
    'completed': 100,
    'cancelled': -1, // キャンセルは特殊扱い
  };
  
  return progressMap[status] ?? 0;
}

/**
 * ステータスが最終状態かどうかを判定
 * @param status ステータス
 * @returns 最終状態の場合true
 */
export function isFinalStatus(status: ProjectStatus): boolean {
  return status === 'completed' || status === 'cancelled';
}

/**
 * ステータスがアクティブかどうかを判定
 * @param status ステータス
 * @returns アクティブな場合true
 */
export function isActiveStatus(status: ProjectStatus): boolean {
  return ['published', 'reviewing', 'contracted', 'in_progress', 'in_review'].includes(status);
}