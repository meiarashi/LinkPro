"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { createClient } from "../../utils/supabase/client";
import { User } from "@supabase/supabase-js";
import Link from 'next/link';
import ClientDashboard from './ClientDashboard';
import ProDashboard from './ProDashboard';
import LoggedInHeader from '../../components/LoggedInHeader';

interface Profile {
  id: string;
  user_type: string;
  full_name: string | null;
  avatar_url: string | null;
  profile_details?: any;
  rate_info?: any;
  contact_info?: any;
  availability?: any;
  visibility?: boolean;
}

interface Project {
  id: string;
  title: string;
  description: string | null;
  budget: string | null;
  duration: string | null;
  status: 'draft' | 'public' | 'private' | 'completed' | 'cancelled';
  created_at: string;
  applications_count?: number;
}

interface Application {
  id: string;
  project_id: string;
  pro_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  message: string | null;
  created_at: string;
  pro_profile?: {
    full_name: string | null;
    profile_details: any;
  };
  project?: {
    id: string;
    title: string;
    budget: string | null;
    duration: string | null;
    status: string;
    client_id: string;
    pro_requirements?: string;
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [recentApplications, setRecentApplications] = useState<Application[]>([]);
  const [proApplications, setProApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [recommendedProjects, setRecommendedProjects] = useState<Project[]>([]);
  
  const fetchClientData = async (userId: string) => {
    setProjectsLoading(true);
    
    // プロジェクト一覧を取得
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('client_id', userId)
      .order('created_at', { ascending: false });

    if (projectsError) {
      console.error("Error fetching projects:", projectsError);
    } else if (projectsData) {
      console.log("Projects fetched:", projectsData.length, "projects");
      // 各プロジェクトの応募数を取得
      const projectsWithCounts = await Promise.all(
        projectsData.map(async (project) => {
          const { count } = await supabase
            .from('applications')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', project.id);
          
          return { ...project, applications_count: count || 0 };
        })
      );
      
      setProjects(projectsWithCounts);
      
      // 最新の応募を取得
      const projectIds = projectsData.map(p => p.id);
      if (projectIds.length > 0) {
        const { data: applicationsData, error: appError } = await supabase
          .from('applications')
          .select('*, projects!inner(title)')
          .in('project_id', projectIds)
          .order('created_at', { ascending: false })
          .limit(10);
        
        // プロフィール情報を別途取得
        if (applicationsData && applicationsData.length > 0) {
          const proIds = Array.from(new Set(applicationsData.map(app => app.pro_id)));
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('id, full_name, profile_details')
            .in('id', proIds);
          
          // プロフィール情報をマージ
          const applicationsWithProfiles = applicationsData.map(app => ({
            ...app,
            pro_profile: profilesData?.find(p => p.id === app.pro_id),
            project: app.projects
          }));
          
          setRecentApplications(applicationsWithProfiles);
        } else if (appError) {
          console.error("Error fetching applications:", appError);
        } else if (applicationsData) {
          setRecentApplications(applicationsData);
        }
      }
    }
    
    setProjectsLoading(false);
  };

  const fetchProData = async (userId: string) => {
    setProjectsLoading(true);
    
    // プロフェッショナルの応募情報を取得
    const { data: applicationsData, error: applicationsError } = await supabase
      .from('applications')
      .select(`
        *,
        project:projects!applications_project_id_fkey(
          id,
          title,
          budget,
          duration,
          status,
          client_id,
          pro_requirements
        )
      `)
      .eq('pro_id', userId)
      .order('created_at', { ascending: false });

    if (applicationsError) {
      console.error("Error fetching professional applications:", applicationsError);
    } else if (applicationsData) {
      setProApplications(applicationsData);
    }
    
    // プロフィールを取得して推奨プロジェクトを設定
    const { data: profileData } = await supabase
      .from('profiles')
      .select('profile_details')
      .eq('id', userId)
      .single();
    
    if (profileData?.profile_details?.ai_skills?.length > 0) {
      // マッチングスコアが高いプロジェクトを取得
      const { data: matchingData } = await supabase
        .from('matching_scores')
        .select(`
          *,
          project:projects!matching_scores_project_id_fkey(
            id,
            title,
            budget,
            duration,
            status,
            client_id,
            description,
            pro_requirements
          )
        `)
        .eq('ai_talent_id', userId)
        .eq('project.status', 'public')
        .order('total_score', { ascending: false })
        .limit(10);
      
      if (matchingData && matchingData.length > 0) {
        // すでに応募したプロジェクトIDを取得
        const appliedProjectIds = applicationsData?.map(app => app.project_id) || [];
        
        console.log('Matching projects found:', matchingData.length);
        console.log('Applied projects:', appliedProjectIds);
        
        // 未応募かつスコアが高いプロジェクトをフィルタリング
        const recommendedWithScores = matchingData
          .filter(item => !appliedProjectIds.includes(item.project_id))
          .slice(0, 5)
          .map(item => ({
            ...item.project,
            matchingScore: item.total_score,
            matchPercentage: item.match_percentage,
            recommendationReason: item.recommendation_reason
          }));
        
        console.log('Recommended projects after filter:', recommendedWithScores.length);
        setRecommendedProjects(recommendedWithScores);
      } else {
        // マッチングスコアがない場合は最新のプロジェクトを表示
        const { data: publicProjects } = await supabase
          .from('projects')
          .select('*')
          .eq('status', 'public')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (publicProjects) {
          const appliedProjectIds = applicationsData?.map(app => app.project_id) || [];
          const notAppliedProjects = publicProjects.filter(
            project => !appliedProjectIds.includes(project.id)
          );
          setRecommendedProjects(notAppliedProjects);
        }
      }
    }
    
    setProjectsLoading(false);
  };

  const fetchUnreadMessageCount = async (userId: string) => {
    // 未読メッセージ数を取得
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userId)
      .eq('read_status', false);
    
    if (!error && count !== null) {
      setUnreadMessageCount(count);
    }
  };
  
  useEffect(() => {
    const getUserData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (!currentUser) {
        router.push("/login");
        return;
      }

      // プロフィール情報を取得
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      } else if (profileData) {
        setProfile(profileData);
        
        // ユーザータイプに応じてデータを取得
        if (profileData.user_type === 'client') {
          await fetchClientData(currentUser.id);
        } else if (profileData.user_type === 'pro') {
          await fetchProData(currentUser.id);
        }
        
        // 未読メッセージ数を取得
        await fetchUnreadMessageCount(currentUser.id);
      }
      
      setLoading(false);
    };


    getUserData();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login');
      }
      setUser(session?.user ?? null);
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [router, supabase]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user || !profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <p>認証されていません。ログインページにリダイレクトします...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <LoggedInHeader userProfile={profile} userEmail={user.email} />

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-8">
        {/* クライアントダッシュボード */}
        {profile.user_type === 'client' && (
          <ClientDashboard 
            projects={projects}
            recentApplications={recentApplications}
            projectsLoading={projectsLoading}
            unreadMessageCount={unreadMessageCount}
            onApplicationUpdate={() => {
              // 応募情報を再取得
              if (profile.user_type === 'client' && user) {
                fetchClientData(user.id);
              }
            }}
          />
        )}

        {/* プロフェッショナル向けダッシュボード */}
        {profile.user_type === 'pro' && (
          <ProDashboard 
            profile={profile}
            proApplications={proApplications}
            projectsLoading={projectsLoading}
            unreadMessageCount={unreadMessageCount}
            recommendedProjects={recommendedProjects}
          />
        )}

        {/* ユーザータイプ未設定 */}
        {!profile.user_type && (
          <div className="bg-white p-8 rounded-lg shadow-sm">
            <p className="text-yellow-600 bg-yellow-50 p-4 rounded-md">
              ユーザータイプが設定されていません。オンボーディングを完了してください。
              <Link href="/onboarding" className="text-primary hover:underline ml-2">
                オンボーディングへ
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}