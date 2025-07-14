"use client";

import Link from 'next/link';
import { Button } from "../../components/ui/button";
import { FolderOpen, MessageSquare, Clock, CheckCircle, Sparkles, Target, AlertCircle } from 'lucide-react';
import { AI_SKILLS, AISkillType } from "../../types/ai-talent";

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
  profile_details?: {
    skills?: string[];
    ai_skills?: AISkillType[];
    ai_tools?: string[];
    ai_experience?: {
      years: number;
      domains: string[];
    };
    ai_achievements?: string;
    introduction?: string;
    experience?: string;
    portfolio?: string;
  };
  rate_info?: any;
}

interface Application {
  id: string;
  project_id: string;
  pro_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  project?: {
    id: string;
    title: string;
    budget: string | null;
    duration: string | null;
    status: string;
    client_id: string;
  };
}

interface ProDashboardProps {
  profile: Profile;
  proApplications: Application[];
  projectsLoading: boolean;
  unreadMessageCount?: number;
  aiProjectCount?: number;
  matchingProjectsCount?: number;
  recommendedProjects?: any[];
}

export default function ProDashboard({ 
  profile, 
  proApplications, 
  projectsLoading,
  unreadMessageCount = 0,
  aiProjectCount = 0,
  matchingProjectsCount = 0,
  recommendedProjects = []
}: ProDashboardProps) {
  
  // AIプロフィール充実度を計算
  const calculateAIProfileCompleteness = () => {
    let score = 0;
    const weights = {
      basic: 20,      // 基本情報
      aiSkills: 20,   // AIスキルタイプ
      aiTools: 20,    // AIツール
      aiExperience: 20, // AI経験
      aiAchievements: 20 // AI実績
    };
    
    if (profile.full_name) score += weights.basic;
    if (profile.profile_details?.ai_skills?.length > 0) score += weights.aiSkills;
    if (profile.profile_details?.ai_tools?.length > 0) score += weights.aiTools;
    if (profile.profile_details?.ai_experience?.years !== undefined) score += weights.aiExperience;
    if (profile.profile_details?.ai_achievements) score += weights.aiAchievements;
    
    return score;
  };
  
  return (
    <div className="space-y-6">
      {/* ヘッダーセクション */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Proダッシュボード</h1>
            <p className="text-gray-600 mt-1">プロジェクトへの応募状況を管理</p>
          </div>
          <div className="flex gap-2">
            <Link href="/profile/edit">
              <Button variant="outline">
                プロフィールを編集
              </Button>
            </Link>
            <Link href="/messages">
              <Button variant="outline" className="flex items-center gap-2 relative">
                <MessageSquare className="w-4 h-4" />
                メッセージ
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessageCount > 9 ? '9+' : unreadMessageCount}
                  </span>
                )}
              </Button>
            </Link>
            <Link href="/projects">
              <Button className="flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                プロジェクトを探す
              </Button>
            </Link>
          </div>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">応募中</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {proApplications.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">承認済み</p>
                <p className="text-2xl font-bold text-green-600">
                  {proApplications.filter(a => a.status === 'accepted').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-gray-400" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">AI案件数</p>
                <p className="text-2xl font-bold text-blue-800">{aiProjectCount}</p>
              </div>
              <Sparkles className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700">マッチング可能</p>
                <p className="text-2xl font-bold text-purple-800">{matchingProjectsCount}</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* AI人材プロフィール充実度 */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            AI人材プロフィール充実度
          </h2>
          <span className="text-2xl font-bold text-blue-600">
            {calculateAIProfileCompleteness()}%
          </span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${calculateAIProfileCompleteness()}%` }}
          />
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">基本情報</span>
            <span className={`text-sm ${profile.full_name ? 'text-green-600' : 'text-gray-400'}`}>
              {profile.full_name ? '✓ 完了' : '未設定'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">AIスキルタイプ</span>
            <span className={`text-sm ${profile.profile_details?.ai_skills?.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {profile.profile_details?.ai_skills?.length > 0 ? '✓ 完了' : '未設定'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">AIツール経験</span>
            <span className={`text-sm ${profile.profile_details?.ai_tools?.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
              {profile.profile_details?.ai_tools?.length > 0 ? `✓ ${profile.profile_details.ai_tools.length}個登録` : '未設定'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">AI活用経験</span>
            <span className={`text-sm ${profile.profile_details?.ai_experience?.years !== undefined ? 'text-green-600' : 'text-gray-400'}`}>
              {profile.profile_details?.ai_experience?.years !== undefined ? '✓ 完了' : '未設定'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">AI活用実績</span>
            <span className={`text-sm ${profile.profile_details?.ai_achievements ? 'text-green-600' : 'text-gray-400'}`}>
              {profile.profile_details?.ai_achievements ? '✓ 完了' : '未設定'}
            </span>
          </div>
        </div>
        
        {calculateAIProfileCompleteness() < 100 && (
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              プロフィールを充実させることで、より多くのマッチング機会が得られます！
            </p>
          </div>
        )}
        
        <Link href="/profile/edit">
          <Button variant="outline" size="sm" className="mt-4 w-full">
            プロフィールを編集
          </Button>
        </Link>
      </div>

      {/* AIスキル情報 */}
      {profile.profile_details?.ai_skills?.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">あなたのAIスキル</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profile.profile_details.ai_skills.map((skillKey) => {
              const skill = AI_SKILLS[skillKey];
              if (!skill) return null;
              return (
                <div key={skillKey} className="p-3 rounded-lg border-2 border-blue-200 bg-blue-50">
                  <div className="font-medium text-blue-900">{skill.label}</div>
                  <div className="text-sm text-blue-700 mt-1">{skill.description}</div>
                </div>
              );
            })}
          </div>
          
          {profile.profile_details?.ai_tools?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">使用可能なAIツール</h3>
              <div className="flex flex-wrap gap-2">
                {profile.profile_details.ai_tools.map((tool, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {tool}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}


      {/* おすすめプロジェクト */}
      {recommendedProjects.length > 0 && profile.profile_details?.ai_skills?.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-500" />
              おすすめのAIプロジェクト
            </h2>
            <Link href="/projects">
              <Button variant="outline" size="sm">
                すべて見る
              </Button>
            </Link>
          </div>
          
          <div className="space-y-3">
            {recommendedProjects.slice(0, 3).map((project) => (
              <div key={project.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link 
                      href={`/projects/${project.id}`}
                      className="font-medium text-gray-800 hover:text-blue-600"
                    >
                      {project.title}
                    </Link>
                    {project.pro_requirements && project.pro_requirements.toLowerCase().includes('ai') && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <Sparkles className="w-3 h-3 mr-1" />
                        AI案件
                      </span>
                    )}
                    <div className="mt-1 text-sm text-gray-600">
                      {project.budget && (
                        <span className="mr-4">予算: {project.budget}</span>
                      )}
                      {project.duration && (
                        <span>期間: {project.duration}</span>
                      )}
                    </div>
                    {project.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <Link href={`/projects/${project.id}`}>
                    <Button size="sm" variant="outline">
                      詳細を見る
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
          
          {recommendedProjects.length > 3 && (
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                他にも{recommendedProjects.length - 3}件のマッチングプロジェクトがあります
              </p>
            </div>
          )}
        </div>
      )}

      {/* 応募一覧 */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">応募履歴</h2>
        {projectsLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : proApplications.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">まだ応募がありません</p>
            <Link href="/projects">
              <Button variant="link" className="mt-2">
                プロジェクトを探す
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {proApplications.map((application) => (
              <div key={application.id} className="border rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <Link 
                      href={`/projects/${application.project?.id}`}
                      className="font-medium text-gray-800 hover:text-blue-600"
                    >
                      {application.project?.title || 'プロジェクト'}
                    </Link>
                    <div className="mt-1 text-sm text-gray-600">
                      {application.project?.budget && (
                        <span className="mr-4">予算: {application.project.budget}</span>
                      )}
                      {application.project?.duration && (
                        <span>期間: {application.project.duration}</span>
                      )}
                    </div>
                    {application.message && (
                      <p className="mt-2 text-sm text-gray-600">{application.message}</p>
                    )}
                    <p className="mt-2 text-xs text-gray-500">
                      応募日: {new Date(application.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <div className="ml-4">
                    {application.status === 'pending' && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                        審査中
                      </span>
                    )}
                    {application.status === 'accepted' && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">
                        承認済み
                      </span>
                    )}
                    {application.status === 'rejected' && (
                      <span className="px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                        却下
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}