"use client";

import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from "../../components/ui/button";
import { Slider } from "../../components/ui/slider";
import LoggedInHeader from '../../components/LoggedInHeader';
import { Search, Filter, Briefcase, Clock, DollarSign, ChevronRight, Users, Save, Bookmark, Trash2, History } from 'lucide-react';

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
  const [searchMode, setSearchMode] = useState<'and' | 'or'>('and');
  const [skillsMode, setSkillsMode] = useState<'and' | 'or'>('and');
  const [budgetRange, setBudgetRange] = useState<number[]>([0, 10000000]);
  const [useBudgetSlider, setUseBudgetSlider] = useState(false);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  // 全スキルのリストを取得
  const [allSkills, setAllSkills] = useState<string[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchSavedSearches();
    loadSearchHistory();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [searchQuery, selectedSkills, budgetFilter, projects, searchMode, skillsMode, budgetRange, useBudgetSlider]);

  // 検索履歴の保存（デバウンス）
  useEffect(() => {
    if (!searchQuery.trim()) return;
    
    const timer = setTimeout(() => {
      saveToHistory(searchQuery);
    }, 5000); // 5秒後に保存

    return () => clearTimeout(timer);
  }, [searchQuery]);

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

  const loadSearchHistory = () => {
    const history = localStorage.getItem('searchHistory');
    if (history) {
      setSearchHistory(JSON.parse(history));
    }
  };

  const saveToHistory = (query: string) => {
    if (!query.trim()) return;
    
    const updatedHistory = [query, ...searchHistory.filter(h => h !== query)].slice(0, 10);
    setSearchHistory(updatedHistory);
    localStorage.setItem('searchHistory', JSON.stringify(updatedHistory));
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    saveToHistory(query);
  };

  const filterProjects = () => {
    let filtered = [...projects];

    // 検索クエリでフィルター
    if (searchQuery) {
      const searchTerms = searchQuery.toLowerCase().split(/\s+/).filter(term => term.length > 0);
      
      filtered = filtered.filter((project: Project) => {
        if (searchMode === 'and') {
          // AND検索: すべての検索語が含まれている必要がある
          return searchTerms.every(term =>
            project.title.toLowerCase().includes(term) ||
            project.description?.toLowerCase().includes(term) ||
            project.required_skills?.some((skill: string) => 
              skill.toLowerCase().includes(term)
            )
          );
        } else {
          // OR検索: いずれかの検索語が含まれていればOK
          return searchTerms.some(term =>
            project.title.toLowerCase().includes(term) ||
            project.description?.toLowerCase().includes(term) ||
            project.required_skills?.some((skill: string) => 
              skill.toLowerCase().includes(term)
            )
          );
        }
      });
    }

    // スキルでフィルター
    if (selectedSkills.length > 0) {
      filtered = filtered.filter((project: Project) => {
        if (!project.required_skills) return false;
        
        if (skillsMode === 'and') {
          // AND: すべての選択スキルが必要
          return selectedSkills.every((skill: string) =>
            project.required_skills?.includes(skill)
          );
        } else {
          // OR: いずれかの選択スキルがあればOK
          return selectedSkills.some((skill: string) =>
            project.required_skills?.includes(skill)
          );
        }
      });
    }

    // 予算でフィルター
    if (useBudgetSlider) {
      // スライダーを使用する場合
      filtered = filtered.filter((project: Project) => {
        if (!project.budget) return false;
        const budgetValue = parseInt(project.budget.replace(/[^0-9]/g, ''));
        return budgetValue >= budgetRange[0] && budgetValue <= budgetRange[1];
      });
    } else if (budgetFilter !== 'all') {
      // ドロップダウンを使用する場合
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

  const fetchSavedSearches = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSavedSearches(data || []);
    } catch (error) {
      console.error('Error fetching saved searches:', error);
    }
  };

  const saveSearch = async () => {
    if (!searchName.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const searchParams = {
        searchQuery,
        selectedSkills,
        budgetFilter,
        searchMode,
        skillsMode,
        budgetRange,
        useBudgetSlider
      };

      const { error } = await supabase
        .from('saved_searches')
        .insert({
          user_id: user.id,
          name: searchName,
          search_params: searchParams
        });

      if (error) throw error;

      setShowSaveDialog(false);
      setSearchName('');
      fetchSavedSearches();
    } catch (error) {
      console.error('Error saving search:', error);
    }
  };

  const loadSavedSearch = (savedSearch: any) => {
    const params = savedSearch.search_params;
    setSearchQuery(params.searchQuery || '');
    setSelectedSkills(params.selectedSkills || []);
    setBudgetFilter(params.budgetFilter || 'all');
    setSearchMode(params.searchMode || 'and');
    setSkillsMode(params.skillsMode || 'and');
    setBudgetRange(params.budgetRange || [0, 10000000]);
    setUseBudgetSlider(params.useBudgetSlider || false);
  };

  const deleteSavedSearch = async (id: string) => {
    try {
      const { error } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchSavedSearches();
    } catch (error) {
      console.error('Error deleting saved search:', error);
    }
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
          <h1 className="text-3xl font-bold text-gray-900">プロジェクトを探す</h1>
          <p className="mt-2 text-gray-600">スキルに合ったプロジェクトを見つけて応募しましょう</p>
        </div>

        {/* 検索・フィルターバー */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="キーワード、スキルで検索..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setShowSearchHistory(true)}
                  onBlur={() => setTimeout(() => setShowSearchHistory(false), 200)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {showSearchHistory && searchHistory.length > 0 && (
                  <div className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <div className="p-2">
                      <div className="text-xs text-gray-500 px-2 pb-1 flex items-center gap-1">
                        <History className="w-3 h-3" />
                        検索履歴
                      </div>
                      {searchHistory.map((history, index) => (
                        <button
                          key={index}
                          onClick={() => handleSearch(history)}
                          className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                        >
                          {history}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {searchQuery && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-gray-600">検索モード:</span>
                  <button
                    onClick={() => setSearchMode('and')}
                    className={`px-2 py-1 text-xs rounded ${searchMode === 'and' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    AND
                  </button>
                  <button
                    onClick={() => setSearchMode('or')}
                    className={`px-2 py-1 text-xs rounded ${searchMode === 'or' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                  >
                    OR
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2"
              >
                <Filter className="w-4 h-4" />
                フィルター
                {(selectedSkills.length > 0 || budgetFilter !== 'all' || useBudgetSlider) && (
                  <span className="ml-1 bg-blue-500 text-white text-xs rounded-full px-2 py-0.5">
                    {selectedSkills.length + (budgetFilter !== 'all' || useBudgetSlider ? 1 : 0)}
                  </span>
                )}
              </Button>
              
              {(searchQuery || selectedSkills.length > 0 || budgetFilter !== 'all' || useBudgetSlider) && (
                <Button
                  variant="outline"
                  onClick={() => setShowSaveDialog(true)}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  保存
                </Button>
              )}
              
              {savedSearches.length > 0 && (
                <div className="relative group">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Bookmark className="w-4 h-4" />
                    保存済み ({savedSearches.length})
                  </Button>
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <div className="p-2 max-h-80 overflow-y-auto">
                      {savedSearches.map((saved) => (
                        <div
                          key={saved.id}
                          className="flex items-center justify-between hover:bg-gray-100 rounded-md group/item"
                        >
                          <button
                            onClick={() => loadSavedSearch(saved)}
                            className="flex-1 text-left px-3 py-2 text-sm"
                          >
                            {saved.name}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSavedSearch(saved.id);
                            }}
                            className="px-2 py-1 text-red-500 hover:text-red-700 opacity-0 group-hover/item:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* フィルターパネル */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <div className="grid md:grid-cols-2 gap-6">
                {/* スキルフィルター */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">必要スキル</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSkillsMode('and')}
                        className={`px-2 py-1 text-xs rounded ${skillsMode === 'and' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        すべて含む
                      </button>
                      <button
                        onClick={() => setSkillsMode('or')}
                        className={`px-2 py-1 text-xs rounded ${skillsMode === 'or' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'}`}
                      >
                        いずれか含む
                      </button>
                    </div>
                  </div>
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
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-700">予算</h3>
                    <button
                      onClick={() => {
                        setUseBudgetSlider(!useBudgetSlider);
                        if (!useBudgetSlider) setBudgetFilter('all');
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      {useBudgetSlider ? 'ドロップダウンに切替' : 'スライダーに切替'}
                    </button>
                  </div>
                  
                  <div className="h-[46px]">
                    {useBudgetSlider ? (
                      <div className="h-full flex flex-col justify-center">
                        <Slider
                          min={0}
                          max={10000000}
                          step={100000}
                          value={budgetRange}
                          onValueChange={setBudgetRange}
                          className="mb-1"
                        />
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>{budgetRange[0].toLocaleString()}円</span>
                          <span>{budgetRange[1].toLocaleString()}円</span>
                        </div>
                      </div>
                    ) : (
                      <select
                        value={budgetFilter}
                        onChange={(e) => setBudgetFilter(e.target.value)}
                        className="w-full h-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="all">すべて</option>
                        <option value="under50">50万円未満</option>
                        <option value="50to100">50万円〜100万円</option>
                        <option value="100to300">100万円〜300万円</option>
                        <option value="over300">300万円以上</option>
                      </select>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 検索結果数 */}
        <div className="mb-4 text-sm text-gray-600">
          {filteredProjects.length}件のプロジェクトが見つかりました
        </div>

        {/* プロジェクト一覧 */}
        {filteredProjects.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">条件に合うプロジェクトが見つかりませんでした</p>
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

      {/* 保存ダイアログ */}
      {showSaveDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">検索条件を保存</h3>
            <input
              type="text"
              placeholder="検索条件の名前"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSaveDialog(false);
                  setSearchName('');
                }}
              >
                キャンセル
              </Button>
              <Button onClick={saveSearch}>
                保存
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}