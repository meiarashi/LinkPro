// データベーススキーマの型定義
// AI人材マッチング機能を含む統合型定義

import { AIProfileDetails, AIRequirements, AISkill, MatchingScore, AIUseCase, ProjectTemplate } from './ai-talent';

// プロフィール
export interface Profile {
  id: string;
  user_type: 'client' | 'pro';
  full_name: string | null;
  avatar_url: string | null;
  profile_details: ProfileDetails;
  rate_info: RateInfo;
  contact_info: ContactInfo;
  availability: Availability;
  visibility: boolean;
  deleted_at: string | null;
  notification_settings: NotificationSettings;
  created_at: string;
  updated_at: string;
}

// プロフィール詳細（AI関連フィールドを含む）
export interface ProfileDetails extends AIProfileDetails {
  bio?: string;
  skills?: string[];
  experience_years?: number;
  portfolio_url?: string;
  location?: string;
  languages?: string[];
  // AI関連フィールドはAIProfileDetailsから継承
}

// レート情報
export interface RateInfo {
  hourly_rate?: number;
  currency?: string;
  negotiable?: boolean;
}

// 連絡先情報
export interface ContactInfo {
  email?: string;
  phone?: string;
  preferred_contact_method?: 'email' | 'phone' | 'message';
}

// 稼働可能状況
export interface Availability {
  status?: 'available' | 'busy' | 'not_available';
  hours_per_week?: number;
  available_from?: string;
  timezone?: string;
}

// 通知設定
export interface NotificationSettings {
  email_notifications: boolean;
  new_message: boolean;
  new_application: boolean;
  application_status: boolean;
  ai_matching?: boolean; // AI案件マッチング通知
}

// プロジェクト
export interface Project {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  budget: string | null;
  duration: string | null;
  required_skills: string[];
  status: 'draft' | 'public' | 'private' | 'completed' | 'cancelled';
  pm_requirements: AIRequirements; // AI要件を含む
  created_at: string;
  updated_at: string;
}

// 応募
export interface Application {
  id: string;
  project_id: string;
  pro_id: string; // pm_idから変更
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  attachments: Attachment[];
  created_at: string;
  updated_at: string;
}

// 添付ファイル
export interface Attachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

// 会話
export interface Conversation {
  id: string;
  participant1_id: string;
  participant2_id: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
}

// メッセージ
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  edit_history: EditHistory[];
  is_deleted: boolean;
  deleted_at: string | null;
  deleted_by: string | null;
  created_at: string;
  updated_at: string;
}

// 編集履歴
export interface EditHistory {
  content: string;
  edited_at: string;
}

// 通知
export interface Notification {
  id: string;
  user_id: string;
  type: 'new_message' | 'new_application' | 'application_accepted' | 'application_rejected' | 'ai_match';
  title: string;
  message: string;
  related_id: string | null;
  read_at: string | null;
  created_at: string;
}

// 保存された検索
export interface SavedSearch {
  id: string;
  user_id: string;
  name: string;
  criteria: SearchCriteria;
  created_at: string;
  updated_at: string;
}

// 検索条件（AI関連フィールドを含む）
export interface SearchCriteria {
  keywords?: string;
  skills?: string[];
  budget_min?: number;
  budget_max?: number;
  duration?: string;
  // AI関連の検索条件
  ai_level?: string;
  ai_tools?: string[];
  industry?: string;
  project_category?: string;
}

// データベースから取得する際の結合型
export interface ProfileWithUser extends Profile {
  user?: {
    id: string;
    email: string;
  };
}

export interface ProjectWithClient extends Project {
  client?: Profile;
  applications_count?: number;
  matching_scores?: MatchingScore[];
}

export interface ApplicationWithDetails extends Application {
  project?: Project;
  pro?: Profile;
}

export interface ConversationWithParticipants extends Conversation {
  participant1?: Profile;
  participant2?: Profile;
  last_message?: Message;
  unread_count?: number;
}

export interface MessageWithSender extends Message {
  sender?: Profile;
}

// Supabaseのテーブル名と型のマッピング
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at' | 'updated_at'>>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at' | 'updated_at'>>;
      };
      applications: {
        Row: Application;
        Insert: Omit<Application, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Application, 'id' | 'created_at' | 'updated_at'>>;
      };
      conversations: {
        Row: Conversation;
        Insert: Omit<Conversation, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Conversation, 'id' | 'created_at' | 'updated_at'>>;
      };
      messages: {
        Row: Message;
        Insert: Omit<Message, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Message, 'id' | 'created_at' | 'updated_at'>>;
      };
      notifications: {
        Row: Notification;
        Insert: Omit<Notification, 'id' | 'created_at'>;
        Update: Partial<Omit<Notification, 'id' | 'created_at'>>;
      };
      saved_searches: {
        Row: SavedSearch;
        Insert: Omit<SavedSearch, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<SavedSearch, 'id' | 'created_at' | 'updated_at'>>;
      };
      // AI関連の新規テーブル
      ai_skills: {
        Row: AISkill;
        Insert: Omit<AISkill, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AISkill, 'id' | 'created_at' | 'updated_at'>>;
      };
      matching_scores: {
        Row: MatchingScore;
        Insert: Omit<MatchingScore, 'id' | 'calculated_at'>;
        Update: Partial<Omit<MatchingScore, 'id' | 'calculated_at'>>;
      };
      ai_use_cases: {
        Row: AIUseCase;
        Insert: Omit<AIUseCase, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<AIUseCase, 'id' | 'created_at' | 'updated_at'>>;
      };
      project_templates: {
        Row: ProjectTemplate;
        Insert: Omit<ProjectTemplate, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProjectTemplate, 'id' | 'created_at' | 'updated_at'>>;
      };
    };
  };
}