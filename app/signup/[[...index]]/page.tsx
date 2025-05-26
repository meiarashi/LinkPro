"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client'; // Adjusted import path

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get('type');
  const [userType, setUserType] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    setMounted(true);
    if (type && (type === 'client' || type === 'pm')) {
      setUserType(type);
      if (typeof window !== 'undefined') {
        localStorage.setItem('userType', type);
      }
    }
  }, [type]);

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          user_type: userType,
        },
        // オプション: redirect Toを指定する場合
        // emailRedirectTo: `${window.location.origin}/auth/callback?type=${userType}`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      //サインアップ成功後、オンボーディングページにリダイレクト
      // Supabaseのメール認証を有効にしている場合は、ユーザーはメールを確認する必要がある
      // その場合、ここでは /auth/confirm-email のようなページにリダイレクトするか、メッセージを表示する
      router.push(userType ? `/onboarding?type=${userType}` : '/onboarding');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <h1 className="text-2xl font-bold text-primary">LinkPro</h1>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {userType === 'client'
            ? 'クライアントとして登録'
            : userType === 'pm'
            ? 'PMとして登録'
            : 'アカウント作成'}
        </h2>
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
                  パスワード
                </label>
                <div className="mt-1">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                  />
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
                >
                  {loading ? '登録中...' : '登録する'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
} 