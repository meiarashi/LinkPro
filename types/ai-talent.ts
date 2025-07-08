// AI人材マッチング機能の型定義

// AI人材レベル
export type AILevel = 'expert' | 'developer' | 'user' | 'supporter';

// AIツール
export type AITool = 
  | 'ChatGPT'
  | 'Claude'
  | 'GitHub Copilot'
  | 'Midjourney'
  | 'Stable Diffusion'
  | 'DALL-E'
  | 'Gemini'
  | 'Perplexity'
  | 'LangChain'
  | 'OpenAI API'
  | 'Anthropic API'
  | string; // その他のツール

// AI経験情報
export interface AIExperience {
  years: number;
  domains: string[];
  achievements: string[];
}

// AI関連のプロフィール詳細
export interface AIProfileDetails {
  ai_level?: AILevel;
  ai_tools?: AITool[];
  ai_experience?: AIExperience;
  ai_certifications?: string[];
  industry_experience?: string[];
}

// AI要件
export interface AIRequirements {
  required_ai_level?: AILevel;
  required_ai_tools?: string[];
  expected_outcomes?: string[];
  budget_range?: {
    min: number;
    max: number;
  };
  project_category?: 'automation' | 'analysis' | 'content' | 'support';
  industry?: string;
  technical_requirements?: {
    programming_languages?: string[];
    frameworks?: string[];
    cloud_platforms?: string[];
  };
}

// AIスキル
export interface AISkill {
  id: string;
  user_id: string;
  skill_level: AILevel;
  category: 'technical' | 'tool' | 'business' | 'industry';
  skill_name: string;
  proficiency: 1 | 2 | 3 | 4 | 5;
  experience_months: number;
  use_cases: string[];
  created_at: string;
  updated_at: string;
}

// マッチングスコア
export interface MatchingScore {
  id: string;
  project_id: string;
  ai_talent_id: string;
  level_match_score: number;
  tool_match_score: number;
  domain_match_score: number;
  total_score: number;
  recommendation_reason: string;
  match_details: Record<string, any>;
  calculated_at: string;
}

// AI活用事例
export interface AIUseCase {
  id: string;
  user_id: string;
  title: string;
  description: string;
  tools_used: string[];
  business_impact: string;
  metrics: {
    efficiency_improvement?: string;
    cost_reduction?: string;
    quality_improvement?: string;
    time_saved?: string;
    [key: string]: any;
  };
  attachments: Array<{
    type: 'image' | 'document' | 'link';
    url: string;
    name: string;
  }>;
  is_public: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

// プロジェクトテンプレート
export interface ProjectTemplate {
  id: string;
  skill_level: AILevel;
  category: string;
  title: string;
  description_template: string;
  typical_requirements: Record<string, any>;
  typical_duration: string;
  budget_range: {
    min: number;
    max: number;
  };
  sample_deliverables: string[];
  required_skills: string[];
  is_active: boolean;
  usage_count: number;
  created_at: string;
  updated_at: string;
}

// AI人材プロフィール（ビュー用）
export interface AITalentProfile {
  id: string;
  full_name: string;
  avatar_url: string;
  ai_level: AILevel;
  ai_tools: string[];
  ai_experience: AIExperience;
  rate_info: any;
  availability: any;
  use_case_count: number;
  skill_count: number;
  avg_match_score: number;
}

// プロジェクトマッチング候補（ビュー用）
export interface ProjectMatchingCandidate {
  project_id: string;
  project_title: string;
  client_id: string;
  ai_talent_id: string;
  talent_name: string;
  total_score: number;
  level_match_score: number;
  tool_match_score: number;
  domain_match_score: number;
  recommendation_reason: string;
  calculated_at: string;
}

// スキルカテゴリの定義
export const SKILL_CATEGORIES = {
  technical: {
    label: '技術スキル',
    skills: ['Python', 'JavaScript', 'Machine Learning', 'Deep Learning', 'Data Analysis', 'API開発']
  },
  tool: {
    label: 'AIツール',
    skills: ['ChatGPT', 'Claude', 'GitHub Copilot', 'Midjourney', 'Stable Diffusion', 'LangChain']
  },
  business: {
    label: 'ビジネススキル',
    skills: ['プロジェクトマネジメント', 'コンサルティング', 'プレゼンテーション', '要件定義', '戦略立案']
  },
  industry: {
    label: '業界知識',
    skills: ['金融', '製造', '小売', '医療', '教育', 'IT', '不動産', 'エンターテインメント']
  }
} as const;

// AI人材レベルの定義
export const AI_LEVELS = {
  expert: {
    label: 'エキスパート',
    description: 'ML/DL開発、研究開発が可能な専門家',
    color: 'purple',
    minRate: 10000
  },
  developer: {
    label: '開発者',
    description: 'API活用アプリ開発、システム実装が可能',
    color: 'blue',
    minRate: 5000
  },
  user: {
    label: '活用者',
    description: 'ChatGPT/Claude活用、プロンプト設計が可能',
    color: 'green',
    minRate: 3000
  },
  supporter: {
    label: '支援者',
    description: '導入コンサル、教育・研修を提供',
    color: 'orange',
    minRate: 5000
  }
} as const;

// プロジェクトカテゴリの定義
export const PROJECT_CATEGORIES = {
  automation: {
    label: '自動化',
    description: '業務プロセスの自動化、効率化',
    icon: '🤖'
  },
  analysis: {
    label: '分析',
    description: 'データ分析、予測モデル構築',
    icon: '📊'
  },
  content: {
    label: 'コンテンツ',
    description: 'コンテンツ生成、クリエイティブ制作',
    icon: '✍️'
  },
  support: {
    label: '支援',
    description: 'カスタマーサポート、チャットボット',
    icon: '💬'
  }
} as const;