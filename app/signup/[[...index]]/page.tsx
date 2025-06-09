"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client'; // Adjusted import path
import Image from 'next/image'; // Imageコンポーネントをインポート

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTypeFromURL = searchParams.get('type');
  const [userType, setUserType] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    if (initialTypeFromURL && (initialTypeFromURL === 'client' || initialTypeFromURL === 'pm')) {
      setUserType(initialTypeFromURL);
      if (typeof window !== 'undefined') {
        localStorage.setItem('userType', initialTypeFromURL);
      }
    }
  }, [initialTypeFromURL]);

  const selectUserType = (selectedType: 'client' | 'pm') => {
    setUserType(selectedType);
    const currentPath = window.location.pathname;
    const newSearchParams = new URLSearchParams(window.location.search);
    newSearchParams.set('type', selectedType);
    router.replace(`${currentPath}?${newSearchParams.toString()}`, { scroll: false });
    if (typeof window !== 'undefined') {
      localStorage.setItem('userType', selectedType);
    }
    setError(null); 
  };

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!userType) {
      setError("アカウントタイプを選択してください。");
      return;
    }
    setLoading(true);
    setError(null);

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: userType,
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else if (authData.user) {
      // profilesテーブルにレコードを作成
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authData.user.id,
          user_type: userType,
          full_name: email.split('@')[0], // メールアドレスから暫定的な名前を設定
          visibility: true,
          profile_details: {},
          contact_info: {},
          rate_info: {},
          availability: {},
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // プロフィール作成に失敗してもオンボーディングで再作成できるので続行
      }
      
      router.push('/onboarding?type=' + userType);
    }
    setLoading(false);
  };

  const handleGoogleSignUp = async () => {
    if (!userType) {
      setError("アカウントタイプを選択してから、Googleで登録してください。");
      setTimeout(() => setError(null), 5000); 
      return;
    }
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?type=${userType}`,
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md pt-10">
        {/* <Link href="/" className="flex justify-center">
          <h1 className="text-2xl font-bold text-primary">LinkPro</h1>
        </Link> */}
        <h2 className="text-center text-3xl font-extrabold text-gray-900">
          {userType === 'client'
            ? 'クライアントとして登録'
            : userType === 'pm'
            ? 'PMとして登録'
            : 'アカウント情報を入力'}
        </h2>
        {/* <p className="mt-2 text-center text-sm text-gray-600">
          {!userType ? 'まずアカウントタイプを選択してください。' : `選択中: ${userType === 'client' ? 'クライアント' : 'PM'}`}
        </p> */}
        <p className="mt-2 text-center text-sm text-gray-600">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary/90">
            こちらからログイン
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {mounted && (
            <>
              <div className="mb-6">
                <p className="block text-sm font-medium text-gray-700 mb-2">
                  アカウントタイプを選択 <span className="text-red-500">*</span>
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => selectUserType('client')}
                    className={`w-full flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${ 
                      userType === 'client' 
                        ? 'bg-primary text-white border-transparent focus:ring-primary' 
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-primary'
                    }`}
                  >
                    クライアント
                  </button>
                  <button
                    type="button"
                    onClick={() => selectUserType('pm')}
                    className={`w-full flex justify-center py-2 px-4 border rounded-md shadow-sm text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${ 
                      userType === 'pm' 
                        ? 'bg-primary text-white border-transparent focus:ring-primary' // PM用にデザインを調整する場合はここを変更 (例: bg-secondary, focus:ring-secondary)
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 focus:ring-primary'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>

              <form onSubmit={handleSignUp} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    メールアドレス
                  </label>
                  <div className="mt-1">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    パスワード (8文字以上)
                  </label>
                  <div className="mt-1">
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                    />
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-600 text-center py-2">{error}</p>
                )}

                <div>
                  <button
                    type="submit"
                    disabled={loading || !userType} 
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading && !error ? '登録中...' : '登録する'}
                  </button>
                </div>
              </form>

              <div className="mt-6">
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">または</span>
                  </div>
                </div>
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={handleGoogleSignUp}
                    disabled={loading || !userType} 
                    className="gsi-material-button w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="gsi-material-button-state"></div>
                    <div className="gsi-material-button-content-wrapper flex items-center">
                      <div className="gsi-material-button-icon" style={{ width: '24px', height: '24px', marginRight: '8px' }}>
                        <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: '100%', height: '100%' }}>
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.45c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                          <path fill="none" d="M0 0h48v48H0z"></path>
                        </svg>
                      </div>
                      <span className="gsi-material-button-contents">Googleで登録</span>
                      <span style={{ display: 'none' }}>Sign up with Google</span>
                    </div>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 