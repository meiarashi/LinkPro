"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "../../components/ui/button";
import { createClient } from "../../utils/supabase/client"; // Use client-side client for now
import { User } from "@supabase/supabase-js";
import Link from 'next/link';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<User | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const getUserData = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      
      if (!currentUser) {
        router.push("/login");
        return;
      }

      // ローカルストレージからユーザータイプを取得 (フォールバック)
      const storedType = localStorage.getItem("userType");
      if (storedType && (storedType === "client" || storedType === "pm")) {
        setUserType(storedType);
      }

      // TODO: Supabaseのユーザーメタデータや別テーブルからuserTypeを取得する
      // 例: if (currentUser && currentUser.user_metadata && currentUser.user_metadata.user_type) {
      //   setUserType(currentUser.user_metadata.user_type);
      // } else if (currentUser) { 
      //   // console.log("Fetching profile for user:", currentUser.id)
      //   // const { data: profile, error } = await supabase
      //   //   .from('profiles') 
      //   //   .select('user_type')
      //   //   .eq('id', currentUser.id)
      //   //   .single();
      //   // if (error) console.error("Error fetching profile:", error);
      //   // if (profile) setUserType(profile.user_type);
      // }
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    // The onAuthStateChange listener will handle redirecting to /login
    router.push('/'); // Or directly to login if preferred
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    // This case should ideally be handled by the redirect in useEffect, 
    // but as a fallback or if the redirect hasn't happened yet:
    return (
        <div className="min-h-screen flex flex-col items-center justify-center">
            <p>認証されていません。ログインページにリダイレクトします...</p>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with User Button/Menu */}
      <header className="bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-primary">LinkPro Dashboard</Link>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-600">{user.email}</span>
            <Button onClick={handleSignOut} variant="outline">
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4 md:p-8">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <h1 className="text-3xl font-bold mb-6 text-gray-800">
            ようこそ、{userType === "client" ? "クライアント" : userType === "pm" ? "PM" : "ユーザー"}さん！
          </h1>
          
          <p className="text-gray-600 mb-4">
            こちらはあなたのダッシュボードです。現在ログインしているユーザーは <span className="font-semibold">{user.email}</span> です。
          </p>
          
          {userType && (
            <p className="text-gray-600 mb-6">
              あなたのユーザータイプは <span className="font-semibold">{userType === "client" ? "クライアント" : "プロジェクトマネージャー"}</span> です。
            </p>
          )}

          {/* TODO: ユーザータイプに応じたコンテンツを表示 */}
          {userType === "client" && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">クライアント向け情報</h2>
              {/* クライアント向けのコンポーネントや情報をここに表示 */}
              <p>プロジェクト管理、PM検索などが利用可能です。</p>
            </div>
          )}

          {userType === "pm" && (
            <div>
              <h2 className="text-2xl font-semibold mb-4 text-gray-700">PM向け情報</h2>
              {/* PM向けのコンポーネントや情報をここに表示 */}
              <p>案件検索、プロフィール設定などが利用可能です。</p>
            </div>
          )}

          {!userType && (
            <p className="text-yellow-600 bg-yellow-50 p-3 rounded-md">
              ユーザータイプが設定されていません。オンボーディングを完了するか、プロフィールを更新してください。
              <Link href="/onboarding" className="text-primary hover:underline ml-2">オンボーディングへ</Link>
            </p>
          )}
        
          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-2">アカウント情報</h3>
            <p className="text-sm text-gray-500">ユーザーID: {user.id}</p>
            {/* 他のユーザー情報を表示 */}
          </div>
        </div>
      </main>
    </div>
  );
} 