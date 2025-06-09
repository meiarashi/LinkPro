"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "../ui/button"
import { createClient } from "../../utils/supabase/client"
import { useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      setLoading(false)
    }
    getUser()

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)
    })

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [supabase])
  
  // ログイン後のページではナビゲーションを表示しない
  const loggedInPages = ['/dashboard', '/messages', '/projects', '/profile', '/settings'];
  if (loggedInPages.some(page => pathname?.startsWith(page))) {
    return null
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/') // ホームにリダイレクト
    router.refresh() // サーバーコンポーネントを再フェッチしてUIを更新
  }

  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-primary">
          LinkPro
        </Link>
        
        <nav className="hidden md:flex items-center space-x-8">
          <Link href="/about" className="text-gray-600 hover:text-gray-900">
            サービスについて
          </Link>
          <Link href="/pricing" className="text-gray-600 hover:text-gray-900">
            料金プラン
          </Link>
          <Link href="/faq" className="text-gray-600 hover:text-gray-900">
            よくある質問
          </Link>
        </nav>
        
        <div className="flex items-center space-x-4">
          {!loading && user ? (
            <>
              <Button asChild variant="outline">
                <Link href="/dashboard">ダッシュボード</Link>
              </Button>
              {/* ここにSupabase用のユーザーメニュー/ボタンを配置できます */}
              {/* 例: <UserMenu user={user} onSignOut={handleSignOut} /> */}
              <Button onClick={handleSignOut} variant="outline">ログアウト</Button>
            </>
          ) : !loading && !user ? (
            <>
              <Button asChild variant="outline">
                <Link href="/login">ログイン</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">無料登録</Link>
              </Button>
            </>
          ) : (
            // ローディング中のプレースホルダーなど
            <div className="h-10 w-24 bg-gray-200 rounded animate-pulse"></div>
          )}
        </div>
      </div>
    </header>
  )
} 