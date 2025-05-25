"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Button } from "../../components/ui/button";
import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoaded, isSignedIn } = useUser();
  const [userType, setUserType] = useState<string | null>(null);
  
  useEffect(() => {
    // ユーザーがログインしていない場合はログインページにリダイレクト
    if (isLoaded && !isSignedIn) {
      router.push("/login");
      return;
    }
    
    // ローカルストレージからユーザータイプを取得
    const storedType = localStorage.getItem("userType");
    if (storedType && (storedType === "client" || storedType === "pm")) {
      setUserType(storedType);
    }
    
    // TODO: または、Supabaseなどからユーザー情報を取得する
    // const fetchUserProfile = async () => {
    //   const profile = await getUserProfile(user.id);
    //   setUserType(profile.userType);
    // };
    // 
    // if (isLoaded && isSignedIn) {
    //   fetchUserProfile();
    // }
  }, [isLoaded, isSignedIn, router, user]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">LinkPro</h1>
          <div className="flex items-center space-x-4">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-6">ようこそ、{user.firstName || "ゲスト"}さん</h2>
          
          {userType === "client" ? (
            <div>
              <h3 className="text-lg font-medium mb-4">クライアントダッシュボード</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">プロジェクト作成</h4>
                  <p className="text-sm text-gray-600 mb-4">新しいプロジェクトを作成して、PMを募集しましょう。</p>
                  <Button>新規プロジェクト作成</Button>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">PM検索</h4>
                  <p className="text-sm text-gray-600 mb-4">条件に合うPMを検索して、直接スカウトすることができます。</p>
                  <Button variant="outline">PM検索</Button>
                </div>
              </div>
            </div>
          ) : userType === "pm" ? (
            <div>
              <h3 className="text-lg font-medium mb-4">PMダッシュボード</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">プロジェクト検索</h4>
                  <p className="text-sm text-gray-600 mb-4">あなたのスキルに合ったプロジェクトを探しましょう。</p>
                  <Button>プロジェクト検索</Button>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">プロフィール管理</h4>
                  <p className="text-sm text-gray-600 mb-4">プロフィールを充実させて、クライアントからのスカウトを増やしましょう。</p>
                  <Button variant="outline">プロフィール編集</Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 mb-4">ユーザータイプが設定されていません。プロフィール設定を完了してください。</p>
              <Button onClick={() => router.push("/onboarding")}>
                プロフィール設定
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
} 