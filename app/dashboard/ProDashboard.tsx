"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from "../../components/ui/button";
import { FolderOpen, MessageSquare, Clock, CheckCircle, Target, Sparkles, AlertCircle } from 'lucide-react';
import { AISkillType } from "../../types/ai-talent";
import { createClient } from "../../utils/supabase/client";

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
  rate_info?: {
    hourly_rate?: string;
  };
  availability?: {
    status?: string;
  };
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
  const router = useRouter();
  const supabase = createClient();
  
  // AIプロフィール充実度を計算
  const calculateAIProfileCompleteness = () => {
    let score = 0;
    const weights = {
      basic: 15,        // 基本情報（名前、紹介文）
      aiSkills: 15,     // AIスキルタイプ
      aiTools: 20,      // AIツール（3つ以上で満点）
      aiExperience: 15, // AI経験（年数と領域）
      aiAchievements: 15, // AI実績
      hourlyRate: 10,   // 時間単価
      availability: 10  // 稼働可能状況
    };
    
    // 基本情報
    if (profile.full_name && profile.profile_details?.introduction) {
      score += weights.basic;
    } else if (profile.full_name) {
      score += weights.basic * 0.5;
    }
    
    // AIスキル
    if (profile.profile_details?.ai_skills && profile.profile_details.ai_skills.length > 0) {
      score += weights.aiSkills;
    }
    
    // AIツール（3つ以上で満点、1-2個で部分点）
    const toolCount = profile.profile_details?.ai_tools?.length || 0;
    if (toolCount >= 3) {
      score += weights.aiTools;
    } else if (toolCount > 0) {
      score += weights.aiTools * (toolCount / 3);
    }
    
    // AI経験（年数と領域両方あれば満点）
    if (profile.profile_details?.ai_experience?.years !== undefined && 
        profile.profile_details?.ai_experience?.domains?.length > 0) {
      score += weights.aiExperience;
    } else if (profile.profile_details?.ai_experience?.years !== undefined) {
      score += weights.aiExperience * 0.5;
    }
    
    // AI実績
    if (profile.profile_details?.ai_achievements && profile.profile_details.ai_achievements.length > 50) {
      score += weights.aiAchievements;
    } else if (profile.profile_details?.ai_achievements) {
      score += weights.aiAchievements * 0.5;
    }
    
    // 時間単価
    if (profile.rate_info?.hourly_rate) {
      score += weights.hourlyRate;
    }
    
    // 稼働可能状況
    if (profile.availability?.status && profile.availability.status !== 'unavailable') {
      score += weights.availability;
    }
    
    return Math.round(score);
  };
  
  // 改善提案を生成
  const getImprovementSuggestions = () => {
    const suggestions = [];
    
    if (!profile.profile_details?.introduction) {
      suggestions.push({
        priority: 'high',
        message: '自己紹介を追加するとクライアントの信頼度が向上します',
        impact: '+15%'
      });
    }
    
    const toolCount = profile.profile_details?.ai_tools?.length || 0;
    if (toolCount < 3) {
      suggestions.push({
        priority: 'high',
        message: `AIツールをあと${3 - toolCount}つ追加するとマッチング率が向上します`,
        impact: '+20%'
      });
    }
    
    if (!profile.profile_details?.ai_experience?.domains || profile.profile_details.ai_experience.domains.length === 0) {
      suggestions.push({
        priority: 'medium',
        message: '活用領域を追加すると適切なプロジェクトが見つかりやすくなります',
        impact: '+10%'
      });
    }
    
    if (!profile.profile_details?.ai_achievements || profile.profile_details.ai_achievements.length < 50) {
      suggestions.push({
        priority: 'medium',
        message: 'AI活用実績を詳しく記載すると応募承認率が上がります',
        impact: '+25%'
      });
    }
    
    if (!profile.rate_info?.hourly_rate) {
      suggestions.push({
        priority: 'low',
        message: '時間単価を設定すると案件とのミスマッチを防げます',
        impact: '+5%'
      });
    }
    
    return suggestions.slice(0, 3); // 最大3つまで表示
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
          <Link href="/projects?filter=applied&status=pending" className="block">
            <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
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
          </Link>
          <Link href="/projects?filter=applied&status=accepted" className="block">
            <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
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
          </Link>
          <Link href="/projects?filter=applied" className="block">
            <div className="bg-gray-50 p-3 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-600">総応募数</p>
                  <p className="text-xl font-bold text-gray-800">{proApplications.length}</p>
                </div>
                <MessageSquare className="w-6 h-6 text-gray-400" />
              </div>
            </div>
          </Link>
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
              <span className={`text-lg font-bold ${
                calculateAIProfileCompleteness() >= 80 ? 'text-green-600' : 
                calculateAIProfileCompleteness() >= 60 ? 'text-blue-600' : 
                'text-orange-600'
              }`}>
                {calculateAIProfileCompleteness()}%
              </span>
            </div>
        
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  calculateAIProfileCompleteness() >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                  calculateAIProfileCompleteness() >= 60 ? 'bg-gradient-to-r from-blue-400 to-blue-600' :
                  'bg-gradient-to-r from-orange-400 to-orange-600'
                }`}
                style={{ width: `${calculateAIProfileCompleteness()}%` }}
              />
            </div>

            <div className="space-y-2 mb-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">基本情報</span>
                <span className={`text-xs ${
                  profile.full_name && profile.profile_details?.introduction ? 'text-green-600' :
                  profile.full_name ? 'text-yellow-600' : 'text-gray-400'
                }`}>
                  {profile.full_name && profile.profile_details?.introduction ? '✓' :
                   profile.full_name ? '△' : '×'}
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
                <span className={`text-xs ${
                  (profile.profile_details?.ai_tools?.length || 0) >= 3 ? 'text-green-600' :
                  (profile.profile_details?.ai_tools?.length || 0) > 0 ? 'text-yellow-600' : 'text-gray-400'
                }`}>
                  {profile.profile_details?.ai_tools && profile.profile_details.ai_tools.length > 0 ? 
                    `${profile.profile_details.ai_tools.length >= 3 ? '✓' : '△'} ${profile.profile_details.ai_tools.length}個` : '×'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">経験・領域</span>
                <span className={`text-xs ${
                  profile.profile_details?.ai_experience?.years !== undefined && 
                  profile.profile_details?.ai_experience?.domains?.length > 0 ? 'text-green-600' :
                  profile.profile_details?.ai_experience?.years !== undefined ? 'text-yellow-600' : 'text-gray-400'
                }`}>
                  {profile.profile_details?.ai_experience?.years !== undefined && 
                   profile.profile_details?.ai_experience?.domains?.length > 0 ? '✓' :
                   profile.profile_details?.ai_experience?.years !== undefined ? '△' : '×'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">実績</span>
                <span className={`text-xs ${
                  profile.profile_details?.ai_achievements && profile.profile_details.ai_achievements.length > 50 ? 'text-green-600' :
                  profile.profile_details?.ai_achievements ? 'text-yellow-600' : 'text-gray-400'
                }`}>
                  {profile.profile_details?.ai_achievements && profile.profile_details.ai_achievements.length > 50 ? '✓' :
                   profile.profile_details?.ai_achievements ? '△' : '×'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">時間単価</span>
                <span className={`text-xs ${profile.rate_info?.hourly_rate ? 'text-green-600' : 'text-gray-400'}`}>
                  {profile.rate_info?.hourly_rate ? '✓' : '×'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">稼働状況</span>
                <span className={`text-xs ${
                  profile.availability?.status && profile.availability.status !== 'unavailable' ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {profile.availability?.status && profile.availability.status !== 'unavailable' ? '✓' : '×'}
                </span>
              </div>
            </div>
            
            {/* 改善提案 */}
            {calculateAIProfileCompleteness() < 100 && (
              <div className="space-y-2 mb-3">
                <p className="text-xs font-semibold text-gray-700">改善提案</p>
                {getImprovementSuggestions().map((suggestion, index) => (
                  <div key={index} className={`p-2 rounded text-xs ${
                    suggestion.priority === 'high' ? 'bg-orange-50 border border-orange-200' :
                    suggestion.priority === 'medium' ? 'bg-blue-50 border border-blue-200' :
                    'bg-gray-50 border border-gray-200'
                  }`}>
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <p className={`${
                          suggestion.priority === 'high' ? 'text-orange-700' :
                          suggestion.priority === 'medium' ? 'text-blue-700' :
                          'text-gray-700'
                        }`}>
                          {suggestion.message}
                        </p>
                      </div>
                      <span className={`font-bold whitespace-nowrap ${
                        suggestion.priority === 'high' ? 'text-orange-600' :
                        suggestion.priority === 'medium' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {suggestion.impact}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {calculateAIProfileCompleteness() === 100 ? (
              <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  プロフィール完成！マッチング率最大化
                </p>
              </div>
            ) : calculateAIProfileCompleteness() >= 80 ? (
              <div className="mt-3 p-2 bg-blue-50 rounded">
                <p className="text-xs text-blue-700 flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  あと少しで完璧なプロフィールに！
                </p>
              </div>
            ) : (
              <div className="mt-3 p-2 bg-orange-50 rounded">
                <p className="text-xs text-orange-700 flex items-start gap-1">
                  <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                  プロフィールを充実させてマッチング率UP！
                </p>
              </div>
            )}
            
            <Link href="/profile/edit">
              <Button 
                variant={calculateAIProfileCompleteness() < 60 ? "default" : "outline"} 
                size="sm" 
                className="mt-3 w-full text-xs"
              >
                プロフィール編集
              </Button>
            </Link>
          </div>
        </div>


        {/* 右カラム - プロジェクト情報 */}
        <div className="lg:col-span-2 space-y-4">
          {/* マッチングプロジェクト - メインセクション */}
          {recommendedProjects.length > 0 && profile.profile_details?.ai_skills && profile.profile_details.ai_skills.length > 0 && (
            <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-lg shadow-sm border border-purple-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-600" />
                  あなたにマッチしたプロジェクト
                </h2>
                <Link href="/projects">
                  <Button variant="outline" size="sm" className="text-sm">
                    もっと見る
                  </Button>
                </Link>
              </div>
          
              <div className="space-y-3">
                {recommendedProjects.slice(0, 5).map((project) => (
                  <div key={project.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <Link 
                          href={`/projects/${project.id}`}
                          className="text-base font-semibold text-gray-800 hover:text-blue-600 line-clamp-2"
                        >
                          {project.title}
                        </Link>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-gray-600">
                          {project.budget && (
                            <span className="flex items-center gap-1">
                              <span className="text-xs">💰</span>
                              {project.budget}
                            </span>
                          )}
                          {project.duration && (
                            <span className="flex items-center gap-1">
                              <span className="text-xs">📅</span>
                              {project.duration}
                            </span>
                          )}
                          {project.pro_requirements?.required_ai_level && (
                            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
                              {project.pro_requirements.required_ai_level === 'expert' ? 'エキスパート' :
                               project.pro_requirements.required_ai_level === 'developer' ? '開発者' :
                               project.pro_requirements.required_ai_level === 'user' ? '活用者' : '支援者'}
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {project.description}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <Button 
                          size="sm" 
                          className="whitespace-nowrap"
                          onClick={async (e) => {
                            e.preventDefault();
                            const button = e.currentTarget;
                            button.disabled = true;
                            button.textContent = '応募中...';
                            
                            try {
                              const { data: { user } } = await supabase.auth.getUser();
                              if (!user) {
                                router.push('/login');
                                return;
                              }
                              
                              const { error } = await supabase
                                .from('applications')
                                .insert({
                                  project_id: project.id,
                                  pro_id: user.id,
                                  status: 'pending',
                                  message: 'マッチングプロジェクトから応募しました。よろしくお願いいたします。'
                                });
                              
                              if (error) {
                                console.error('Application error:', error);
                                button.textContent = 'エラー';
                                setTimeout(() => {
                                  button.disabled = false;
                                  button.textContent = '応募する';
                                }, 2000);
                              } else {
                                button.textContent = '応募済み';
                                button.classList.add('bg-gray-500', 'hover:bg-gray-500');
                                // ページをリロードして状態を更新
                                setTimeout(() => {
                                  window.location.reload();
                                }, 1000);
                              }
                            } catch (err) {
                              console.error('Error:', err);
                              button.disabled = false;
                              button.textContent = '応募する';
                            }
                          }}
                        >
                          応募する
                        </Button>
                        <Link href={`/projects/${project.id}`}>
                          <Button size="sm" variant="outline" className="w-full text-xs">
                            詳細を見る
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          
            </div>
          )}

          {/* 応募一覧 */}
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-gray-800">最近の応募</h2>
              {proApplications.length > 0 && (
                <Link href="/projects?filter=applied">
                  <Button variant="outline" size="sm" className="text-xs">
                    すべて見る
                  </Button>
                </Link>
              )}
            </div>
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