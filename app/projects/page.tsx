"use client";

import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "../../components/ui/button";
import LoggedInHeader from '../../components/LoggedInHeader';
import { Search, Filter, Briefcase, Clock, DollarSign, ChevronRight, Users } from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string | null;
  budget: string | null;
  duration: string | null;
  required_skills: string[] | null;
  status: string;
  created_at: string;
  client?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  _count?: {
    applications: number;
  };
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [budgetFilter, setBudgetFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const supabase = createClient();
  const router = useRouter();

  // 全スキルのリストを取得
  const [allSkills, setAllSkills] = useState<string[]>([]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [searchQuery, selectedSkills, budgetFilter, projects]);

  const fetchProjects = async () => {
    try {
      // ユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setCurrentUser(user);

      // プロフィール情報を取得
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setUserProfile(profileData);
      }

      // 公開中のプロジェクトを取得
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'public')
        .order('created_at', { ascending: false });

      if (projectsError) throw projectsError;

      // 各プロジェクトの応募数とクライアント情報を取得
      if (projectsData) {
        const projectsWithCounts = await Promise.all(
          projectsData.map(async (project: any) => {
            // 応募数を取得
            const { count } = await supabase
              .from('applications')
              .select('*', { count: 'exact', head: true })
              .eq('project_id', project.id);
            
            // クライアント情報を取得
            const { data: clientData } = await supabase
              .from('profiles')
              .select('id, full_name, avatar_url')
              .eq('id', project.client_id)
              .single();
            
            return {
              ...project,
              client: clientData,
              _count: {
                applications: count || 0
              }
            };
          })
        );

        setProjects(projectsWithCounts);
        setFilteredProjects(projectsWithCounts);

        // スキルリストを生成
        const skills = new Set<string>();
        projectsWithCounts.forEach((project: Project) => {
          if (project.required_skills) {
            project.required_skills.forEach((skill: string) => skills.add(skill));
          }
        });
        setAllSkills(Array.from(skills).sort());
      }
    } catch (error) {
      console.error('Error in fetchProjects:', error);
      // エラーが発生しても空の配列をセットして表示を続ける
      setProjects([]);
      setFilteredProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = [...projects];

    // 検索クエリでフィルター
    if (searchQuery) {
      filtered = filtered.filter((project: Project) => 
        project.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.required_skills?.some((skill: string) => 
          skill.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // スキルでフィルター
    if (selectedSkills.length > 0) {
      filtered = filtered.filter((project: Project) =>
        selectedSkills.every((skill: string) =>
          project.required_skills?.includes(skill)
        )
      );
    }

    // 予算でフィルター
    if (budgetFilter !== 'all') {
      filtered = filtered.filter((project: Project) => {
        if (!project.budget) return false;
        const budgetValue = parseInt(project.budget.replace(/[^0-9]/g, ''));
        
        switch (budgetFilter) {
          case 'under50':
            return budgetValue < 500000;
          case '50to100':
            return budgetValue >= 500000 && budgetValue < 1000000;
          case '100to300':
            return budgetValue >= 1000000 && budgetValue < 3000000;
          case 'over300':
            return budgetValue >= 3000000;
          default:
            return true;
        }
      });
    }

    setFilteredProjects(filtered);
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills(prev =>
      prev.includes(skill)
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      {userProfile && (
        <LoggedInHeader userProfile={userProfile} userEmail={currentUser?.email} />
      )}
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ページタイトル */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">案件を探す</h1>
          <p className="mt-2 text-gray-600">スキルに合った案件を見つけて応募しましょう</p>
        </div>

        {/* 検索・フィルターバー */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="キーワード、スキルで検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              フィルター
              {(selectedSkills.length > 0 || budgetFilter !== 'all') && (
                <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                  {selectedSkills.length + (budgetFilter !== 'all' ? 1 : 0)}
                </span>
              )}
            </Button>
          </div>

          {/* フィルターパネル */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid md:grid-cols-2 gap-6">
                {/* スキルフィルター */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">必要スキル</h3>
                  <div className="flex flex-wrap gap-2">
                    {allSkills.map((skill: string) => (
                      <button
                        key={skill}
                        onClick={() => toggleSkill(skill)}
                        className={`px-3 py-1.5 text-sm rounded-full transition-colors ${
                          selectedSkills.includes(skill)
                            ? 'bg-blue-500 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 予算フィルター */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">予算</h3>
                  <select
                    value={budgetFilter}
                    onChange={(e) => setBudgetFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="all">すべて</option>
                    <option value="under50">50万円未満</option>
                    <option value="50to100">50万円〜100万円</option>
                    <option value="100to300">100万円〜300万円</option>
                    <option value="over300">300万円以上</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 検索結果数 */}
        <div className="mb-4 text-sm text-gray-600">
          {filteredProjects.length}件の案件が見つかりました
        </div>

        {/* プロジェクト一覧 */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">条件に合う案件が見つかりませんでした</p>
            <p className="text-sm text-gray-400 mt-2">検索条件を変更してお試しください</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProjects.map((project: Project) => (
              <div key={project.id} className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Link 
                        href={`/projects/${project.id}`}
                        className="text-xl font-semibold text-gray-900 hover:text-blue-600 transition-colors"
                      >
                        {project.title}
                      </Link>
                      
                      {project.description && (
                        <p className="mt-2 text-gray-600 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                        {project.budget && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4" />
                            <span>予算: {project.budget}</span>
                          </div>
                        )}
                        {project.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            <span>期間: {project.duration}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{project._count?.applications || 0}名が応募</span>
                        </div>
                      </div>

                      {project.required_skills && project.required_skills.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {project.required_skills.map((skill: string, index: number) => (
                            <span
                              key={index}
                              className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <Link href={`/projects/${project.id}`}>
                      <Button variant="ghost" size="sm" className="ml-4">
                        詳細を見る
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </Link>
                  </div>

                  <div className="mt-4 pt-4 border-t flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {project.client?.avatar_url ? (
                        <img
                          src={project.client.avatar_url}
                          alt={project.client.full_name || 'Client'}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs text-gray-600">
                            {project.client?.full_name?.charAt(0) || 'C'}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {project.client?.full_name || '匿名クライアント'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(project.created_at).toLocaleDateString('ja-JP')}に投稿
                        </p>
                      </div>
                    </div>
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