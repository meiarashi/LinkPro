"use client";

import Link from 'next/link';
import { Button } from "../../components/ui/button";
import { FolderOpen, MessageSquare, Clock, CheckCircle, Target, Sparkles, AlertCircle } from 'lucide-react';
import { AISkillType } from "../../types/ai-talent";

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
  recommendedProjects?: any[];
}

export default function ProDashboard({ 
  profile, 
  proApplications, 
  projectsLoading,
  unreadMessageCount = 0,
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
    if (profile.profile_details?.ai_skills && profile.profile_details.ai_skills.length > 0) score += weights.aiSkills;
    if (profile.profile_details?.ai_tools && profile.profile_details.ai_tools.length > 0) score += weights.aiTools;
    if (profile.profile_details?.ai_experience?.years !== undefined) score += weights.aiExperience;
    if (profile.profile_details?.ai_achievements) score += weights.aiAchievements;
    
    return score;
  };
  
  return (
    <div className="space-y-4">
      {/* ヘッダーセクション */}
      <div className="bg-white p-4 rounded-lg shadow-sm">
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">応募中</p>
                <p className="text-xl font-bold text-yellow-600">
                  {proApplications.filter(a => a.status === 'pending').length}
                </p>
              </div>
              <Clock className="w-6 h-6 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">承認済み</p>
                <p className="text-xl font-bold text-green-600">
                  {proApplications.filter(a => a.status === 'accepted').length}
                </p>
              </div>
              <CheckCircle className="w-6 h-6 text-gray-400" />
            </div>
          </div>
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-600">総応募数</p>
                <p className="text-xl font-bold text-gray-800">{proApplications.length}</p>
              </div>
              <MessageSquare className="w-6 h-6 text-gray-400" />
            </div>
          </div>
        </div>
      </div>

      {/* メインコンテンツ - 2カラムレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 左カラム - プロフィール情報 */}
        <div className="lg:col-span-1 space-y-4">
          {/* AI人材プロフィール充実度 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-500" />
                AIプロフィール
              </h2>
              <span className="text-lg font-bold text-blue-600">
                {calculateAIProfileCompleteness()}%
              </span>
            </div>
        
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${calculateAIProfileCompleteness()}%` }}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">基本情報</span>
                <span className={`text-xs ${profile.full_name ? 'text-green-600' : 'text-gray-400'}`}>
                  {profile.full_name ? '✓' : '×'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">AIスキル</span>
                <span className={`text-xs ${profile.profile_details?.ai_skills && profile.profile_details.ai_skills.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {profile.profile_details?.ai_skills && profile.profile_details.ai_skills.length > 0 ? '✓' : '×'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">AIツール</span>
                <span className={`text-xs ${profile.profile_details?.ai_tools && profile.profile_details.ai_tools.length > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  {profile.profile_details?.ai_tools && profile.profile_details.ai_tools.length > 0 ? `✓ ${profile.profile_details.ai_tools.length}` : '×'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">経験年数</span>
                <span className={`text-xs ${profile.profile_details?.ai_experience?.years !== undefined ? 'text-green-600' : 'text-gray-400'}`}>
                  {profile.profile_details?.ai_experience?.years !== undefined ? '✓' : '×'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">実績</span>
                <span className={`text-xs ${profile.profile_details?.ai_achievements ? 'text-green-600' : 'text-gray-400'}`}>
                  {profile.profile_details?.ai_achievements ? '✓' : '×'}
                </span>
              </div>
            </div>
            
            {calculateAIProfileCompleteness() < 100 && (
              <div className="mt-3 p-2 bg-blue-50 rounded">
                <p className="text-xs text-blue-700 flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  プロフィールを充実させよう！
                </p>
              </div>
            )}
            
            <Link href="/profile/edit">
              <Button variant="outline" size="sm" className="mt-3 w-full text-xs">
                プロフィール編集
              </Button>
            </Link>
          </div>
        </div>


        {/* 右カラム - プロジェクト情報 */}
        <div className="lg:col-span-2 space-y-4">
          {/* おすすめプロジェクト */}
          {recommendedProjects.length > 0 && profile.profile_details?.ai_skills && profile.profile_details.ai_skills.length > 0 && (
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-500" />
                  おすすめプロジェクト
                </h2>
                <Link href="/projects">
                  <Button variant="outline" size="sm" className="text-xs">
                    すべて見る
                  </Button>
                </Link>
              </div>
          
              <div className="space-y-2">
                {recommendedProjects.slice(0, 2).map((project) => (
                  <div key={project.id} className="border rounded-lg p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <Link 
                          href={`/projects/${project.id}`}
                          className="text-sm font-medium text-gray-800 hover:text-blue-600 line-clamp-1"
                        >
                          {project.title}
                        </Link>
                        <div className="mt-1 text-xs text-gray-600">
                          {project.budget && (
                            <span className="mr-3">{project.budget}</span>
                          )}
                          {project.duration && (
                            <span>{project.duration}</span>
                          )}
                        </div>
                      </div>
                      <Link href={`/projects/${project.id}`}>
                        <Button size="sm" variant="outline" className="text-xs h-7">
                          詳細
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
          
            </div>
          )}

          {/* 応募一覧 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <h2 className="text-base font-semibold text-gray-800 mb-3">最近の応募</h2>
            {projectsLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary mx-auto"></div>
              </div>
            ) : proApplications.length === 0 ? (
              <div className="text-center py-4">
                <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">まだ応募がありません</p>
              </div>
            ) : (
              <div className="space-y-2">
                {proApplications.slice(0, 3).map((application) => (
                  <Link key={application.id} href={`/projects/${application.project?.id}`} className="block">
                    <div className="border rounded-lg p-3 hover:bg-gray-50 cursor-pointer transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-800 hover:text-blue-600 line-clamp-1">
                            {application.project?.title || 'プロジェクト'}
                          </p>
                          <div className="mt-1 text-xs text-gray-600">
                            {new Date(application.created_at).toLocaleDateString('ja-JP')}
                          </div>
                        </div>
                        <div className="ml-2">
                          {application.status === 'pending' && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700">
                              審査中
                            </span>
                          )}
                          {application.status === 'accepted' && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                              承認
                            </span>
                          )}
                          {application.status === 'rejected' && (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                              却下
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                {proApplications.length > 3 && (
                  <div className="text-center pt-2">
                    <p className="text-xs text-gray-500">
                      他{proApplications.length - 3}件の応募
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}