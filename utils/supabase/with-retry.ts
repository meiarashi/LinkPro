import { createClient } from './client';

interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: string[];
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'NETWORK_ERROR',
    'TIMEOUT',
    '500',
    '502',
    '503',
    '504',
  ]
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;
  let delay = opts.initialDelay!;
  
  for (let attempt = 1; attempt <= opts.maxAttempts!; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;
      
      // 最後の試行の場合はエラーをスロー
      if (attempt === opts.maxAttempts) {
        throw error;
      }
      
      // リトライ可能なエラーかチェック
      const isRetryable = opts.retryableErrors!.some(retryableError => {
        const errorMessage = error?.message || '';
        const errorCode = error?.code || '';
        return errorMessage.includes(retryableError) || 
               errorCode.includes(retryableError) ||
               (error?.status && error.status.toString() === retryableError);
      });
      
      if (!isRetryable) {
        throw error;
      }
      
      // バックオフ待機
      console.log(`Retry attempt ${attempt}/${opts.maxAttempts}. Waiting ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      
      // 次回の遅延を計算（指数バックオフ）
      delay = Math.min(delay * opts.backoffMultiplier!, opts.maxDelay!);
    }
  }
  
  throw lastError;
}

// Supabaseクエリ用のヘルパー関数
export async function supabaseWithRetry<T>(
  queryBuilder: () => any,
  options?: RetryOptions
): Promise<{ data: T | null; error: any }> {
  try {
    const result = await withRetry(async () => {
      const response = await queryBuilder();
      if (response.error) {
        // ネットワークエラーやサーバーエラーの場合はリトライ
        if (response.error.message?.includes('fetch') || 
            response.error.message?.includes('network') ||
            (response.error.code && response.error.code.startsWith('5'))) {
          throw response.error;
        }
        // それ以外のエラーはリトライしない
        return response;
      }
      return response;
    }, options);
    
    return result;
  } catch (error) {
    return { data: null, error };
  }
}

// オフライン検出とキャッシュ機能
export class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = true;
  private pendingOperations: Array<() => Promise<any>> = [];
  
  private constructor() {
    if (typeof window !== 'undefined') {
      this.isOnline = navigator.onLine;
      
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.processPendingOperations();
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }
  
  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }
  
  isNetworkAvailable(): boolean {
    return this.isOnline;
  }
  
  addPendingOperation(operation: () => Promise<any>): void {
    this.pendingOperations.push(operation);
  }
  
  private async processPendingOperations(): Promise<void> {
    console.log(`Processing ${this.pendingOperations.length} pending operations...`);
    
    while (this.pendingOperations.length > 0) {
      const operation = this.pendingOperations.shift();
      if (operation) {
        try {
          await operation();
        } catch (error) {
          console.error('Failed to process pending operation:', error);
        }
      }
    }
  }
}

// エラー通知ヘルパー
export function handleSupabaseError(error: any, context: string): string {
  console.error(`Supabase error in ${context}:`, error);
  
  // ユーザーフレンドリーなエラーメッセージ
  if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
    return 'ネットワーク接続に問題があります。しばらくしてからもう一度お試しください。';
  }
  
  if (error?.code === '23505') {
    return 'この情報は既に登録されています。';
  }
  
  if (error?.code === '23503') {
    return '関連するデータが見つかりません。';
  }
  
  if (error?.code?.startsWith('5')) {
    return 'サーバーに一時的な問題が発生しています。しばらくしてからもう一度お試しください。';
  }
  
  if (error?.code === 'PGRST116') {
    return 'データが見つかりません。';
  }
  
  if (error?.code === '42501') {
    return 'この操作を実行する権限がありません。';
  }
  
  return error?.message || 'エラーが発生しました。もう一度お試しください。';
}