"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

export default function SSOCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // ローカルストレージからユーザータイプを取得
    const userType = typeof window !== 'undefined' ? localStorage.getItem("userType") : null;
    
    // クエリパラメータからエラーをチェック
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    
    if (errorParam) {
      setError(errorDescription || "認証中にエラーが発生しました。");
      // エラーがあっても3秒後にホームページにリダイレクト
      setTimeout(() => {
        router.push("/");
      }, 3000);
      return;
    }
    
    try {
      // 適切なリダイレクト先を決定
      const redirectTo = searchParams.get("redirect_url") || 
                         (userType ? `/onboarding?type=${userType}` : "/dashboard");
      
      // サインアップから来た場合はオンボーディングへ、そうでない場合はダッシュボードへ
      setTimeout(() => {
        router.push(redirectTo);
      }, 1500);
    } catch (err) {
      console.error("リダイレクトエラー:", err);
      setError("リダイレクト中にエラーが発生しました。");
      // エラー発生時は3秒後にホームページにリダイレクト
      setTimeout(() => {
        router.push("/");
      }, 3000);
    }
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500" />
          <h2 className="text-2xl font-semibold text-red-700">認証エラー</h2>
          <p className="text-gray-600">{error}</p>
          <p className="text-sm text-gray-500">ホームページにリダイレクトします...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="text-2xl font-semibold">認証しています...</h2>
        <p className="text-gray-500">少々お待ちください</p>
      </div>
    </div>
  );
} 