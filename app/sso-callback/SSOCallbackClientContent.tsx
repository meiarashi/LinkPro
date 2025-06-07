"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, AlertCircle } from "lucide-react";
import { createClient } from "../../utils/supabase/client";

export default function SSOCallbackClientContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const userType = searchParams.get("type") || localStorage.getItem("userType");
      const errorParam = searchParams.get("error");
      const errorDescription = searchParams.get("error_description");
      
      if (errorParam) {
        setError(errorDescription || "認証中にエラーが発生しました。");
        setTimeout(() => { router.push("/"); }, 3000);
        return;
      }
      
      try {
        // 現在のユーザー情報を取得
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user && userType) {
          // profilesテーブルにレコードが存在するか確認
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();
          
          // プロフィールが存在しない場合は作成
          if (!existingProfile) {
            const { error: profileError } = await supabase
              .from('profiles')
              .insert({
                id: user.id,
                user_type: userType,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'ユーザー',
                visibility: true,
                profile_details: {},
                contact_info: {},
                rate_info: {},
                availability: {},
              });
            
            if (profileError) {
              console.error('Error creating profile:', profileError);
            }
          }
        }
        
        const redirectTo = searchParams.get("redirect_url") || 
                           (userType ? `/onboarding?type=${userType}` : "/dashboard");
        setTimeout(() => { router.push(redirectTo); }, 1500);
      } catch (err) {
        console.error("リダイレクトエラー:", err);
        setError("リダイレクト中にエラーが発生しました。");
        setTimeout(() => { router.push("/"); }, 3000);
      }
    };
    
    handleCallback();
  }, [router, searchParams, supabase]);

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