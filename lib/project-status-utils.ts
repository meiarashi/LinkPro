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
    'draft': ['recruiting', 'cancelled'],
    'recruiting': ['draft', 'executing', 'cancelled'],  // 下書きに戻せる
    'executing': ['completed', 'cancelled'],  // 実行中からは完了かキャンセルのみ
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
    'draft': ['recruiting', 'cancelled'],
    'recruiting': ['draft', 'executing', 'cancelled'],  // 下書きに戻せる
    'executing': ['completed', 'cancelled'],  // 実行中からは完了かキャンセルのみ
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
  }, 
  newStatus: ProjectStatus
): string | null {
  // 基本的な遷移可能性チェック
  if (!canTransitionTo(project.status, newStatus)) {
    return `${project.status}から${newStatus}への変更はできません`;
  }
  
  // 特定の条件チェック
  if (newStatus === 'executing' && !project.selected_pro_id) {
    return 'プロジェクトを実行するには、まずプロ人材を選定してください';
  }
  
  return null;
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
  return ['recruiting', 'executing'].includes(status);
}