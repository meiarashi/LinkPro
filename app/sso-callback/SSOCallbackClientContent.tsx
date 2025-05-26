"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";

export default function SSOCallbackClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const userType = typeof window !== 'undefined' ? localStorage.getItem("userType") : null;
    const errorParam = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");
    
    if (errorParam) {
      setError(errorDescription || "認証中にエラーが発生しました。");
      setTimeout(() => { router.push("/"); }, 3000);
      return;
    }
    
    try {
      const redirectTo = searchParams.get("redirect_url") || 
                         (userType ? `/onboarding?type=${userType}` : "/dashboard");
      setTimeout(() => { router.push(redirectTo); }, 1500);
    } catch (err) {
      console.error("リダイレクトエラー:", err);
      setError("リダイレクト中にエラーが発生しました。");
      setTimeout(() => { router.push("/"); }, 3000);
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