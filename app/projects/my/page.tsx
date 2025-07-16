"use client";

import { useState, useEffect, Suspense } from 'react';
import { createClient } from '../../../utils/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from "../../../components/ui/button";
import LoggedInHeader from '../../../components/LoggedInHeader';
import { 
  Plus, FolderOpen, Users, Clock, CheckCircle, XCircle, 
  Edit, Eye, Archive, AlertCircle, Search, Filter
} from 'lucide-react';

interface Project {
  id: string;
  title: string;
  description: string | null;
  budget: string | null;
  duration: string | null;
  status: 'draft' | 'public' | 'private' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  applications?: Application[];
  _count?: {
    applications: number;
  };
}

interface Application {
  id: string;
  project_id: string;
  pro_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  pro_profile?: {
    id: string;
    full_name: string | null;
    profile_details?: any;
  };
}

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
}

function MyProjectsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'projects');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, statusFilter, searchQuery]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
      
      if (!user) {
        router.push('/login');
        return;
      }

      // プロフィール取得
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profileData || profileData.user_type !== 'client') {
        router.push('/dashboard');
        return;
      }

      setProfile(profileData);

      // プロジェクト一覧取得
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          applications (
            *,
            pro_profile:profiles!applications_pro_id_fkey(
              id,
              full_name,
              profile_details
            )
          )
        `)
        .eq('client_id', user.id)
        .order('created_at', { ascending: false });

      console.log('Projects query result:', projectsData);
      console.log('Projects query error:', projectsError);
      
      if (projectsData) {
        setProjects(projectsData);
        
        // すべての応募を集計
        const allApplications = projectsData.flatMap(p => p.applications || []);
        setApplications(allApplications);
      } else {
        console.log('No projects data returned');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = [...projects];

    // ステータスフィルター
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // 検索フィルター
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProjects(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      draft: { label: '下書き', className: 'bg-gray-100 text-gray-700', icon: Edit },
      public: { label: '公開中', className: 'bg-green-100 text-green-700', icon: Eye },
      private: { label: '非公開', className: 'bg-yellow-100 text-yellow-700', icon: Archive },
      completed: { label: '完了', className: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      cancelled: { label: '中止', className: 'bg-red-100 text-red-700', icon: XCircle }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.draft;
    const Icon = config.icon;
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${config.className}`}>
        <Icon className="w-3 h-3" />
        {config.label}
      </span>
    );
  };

  const getApplicationStatusBadge = (status: string) => {
    const statusMap = {
      pending: { label: '審査中', className: 'bg-yellow-100 text-yellow-700' },
      accepted: { label: '承認', className: 'bg-green-100 text-green-700' },
      rejected: { label: '却下', className: 'bg-red-100 text-red-700' }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <LoggedInHeader userProfile={profile!} userEmail="" />

      <main className="container mx-auto p-4 md:p-8">
        {/* ヘッダー */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">プロジェクト管理</h1>
              <p className="text-gray-600 mt-1">あなたのプロジェクトと応募状況を管理</p>
            </div>
            <Link href="/projects/new">
              <Button className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                新規プロジェクト作成
              </Button>
            </Link>
          </div>

          {/* 統計情報 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">総プロジェクト</p>
                  <p className="text-2xl font-bold text-gray-800">{projects.length}</p>
                </div>
                <FolderOpen className="w-8 h-8 text-gray-400" />
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">公開中</p>
                  <p className="text-2xl font-bold text-green-600">
                    {projects.filter(p => p.status === 'public').length}
                  </p>
                </div>
                <Eye className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">総応募数</p>
                  <p className="text-2xl font-bold text-blue-600">{applications.length}</p>
                </div>
                <Users className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">審査中</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {applications.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
          </div>
        </div>

        {/* タブ */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="border-b">
            <div className="flex">
              <button
                onClick={() => setActiveTab('projects')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'projects'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                プロジェクト一覧
              </button>
              <button
                onClick={() => setActiveTab('applications')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'applications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                応募管理
                {applications.filter(a => a.status === 'pending').length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
                    {applications.filter(a => a.status === 'pending').length}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* プロジェクト一覧タブ */}
          {activeTab === 'projects' && (
            <div className="p-6">
              {/* フィルター */}
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="プロジェクトを検索..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">すべて</option>
                    <option value="draft">下書き</option>
                    <option value="public">公開中</option>
                    <option value="private">非公開</option>
                    <option value="completed">完了</option>
                    <option value="cancelled">中止</option>
                  </select>
                </div>
              </div>

              {/* プロジェクト一覧 */}
              {filteredProjects.length === 0 ? (
                <div className="text-center py-12">
                  <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">プロジェクトが見つかりません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredProjects.map((project) => (
                    <div key={project.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <Link href={`/projects/${project.id}`}>
                              <h3 className="text-lg font-semibold text-gray-800 hover:text-blue-600 cursor-pointer">
                                {project.title}
                              </h3>
                            </Link>
                            {getStatusBadge(project.status)}
                          </div>
                          {project.description && (
                            <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                              {project.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            {project.budget && (
                              <span className="flex items-center gap-1">
                                <span>💰</span> {project.budget}
                              </span>
                            )}
                            {project.duration && (
                              <span className="flex items-center gap-1">
                                <span>📅</span> {project.duration}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Users className="w-4 h-4" />
                              応募: {project.applications?.length || 0}件
                            </span>
                            <span className="text-xs">
                              作成: {new Date(project.created_at).toLocaleDateString('ja-JP')}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Link href={`/projects/${project.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-1" />
                              詳細
                            </Button>
                          </Link>
                          <Link href={`/projects/${project.id}/edit`}>
                            <Button variant="outline" size="sm">
                              <Edit className="w-4 h-4 mr-1" />
                              編集
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 応募管理タブ */}
          {activeTab === 'applications' && (
            <div className="p-6">
              {applications.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">まだ応募がありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {applications
                    .sort((a, b) => {
                      // pending を優先
                      if (a.status === 'pending' && b.status !== 'pending') return -1;
                      if (a.status !== 'pending' && b.status === 'pending') return 1;
                      // 日付順
                      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
                    })
                    .map((application) => {
                      const project = projects.find(p => p.id === application.project_id);
                      return (
                        <div key={application.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <h4 className="font-medium text-gray-800">
                                  {application.pro_profile?.full_name || 'プロフェッショナル'}
                                </h4>
                                {getApplicationStatusBadge(application.status)}
                              </div>
                              {project && (
                                <Link href={`/projects/${project.id}`}>
                                  <p className="text-sm text-blue-600 hover:underline mb-1">
                                    プロジェクト: {project.title}
                                  </p>
                                </Link>
                              )}
                              {application.message && (
                                <p className="text-sm text-gray-600 mb-2">{application.message}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                応募日: {new Date(application.created_at).toLocaleDateString('ja-JP')}
                              </p>
                            </div>
                            <div className="flex gap-2 ml-4">
                              {application.pro_profile && (
                                <Link href={`/professionals/${application.pro_profile.id}`}>
                                  <Button variant="outline" size="sm">
                                    プロフィール
                                  </Button>
                                </Link>
                              )}
                              {project && (
                                <Link href={`/projects/${project.id}`}>
                                  <Button variant="outline" size="sm">
                                    プロジェクト詳細
                                  </Button>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// Loading component
function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

// Main export with Suspense
export default function MyProjectsPage() {
  return (
    <Suspense fallback={<Loading />}>
      <MyProjectsContent />
    </Suspense>
  );
}