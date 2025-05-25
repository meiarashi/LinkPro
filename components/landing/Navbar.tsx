"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"
import { useUser } from "@clerk/nextjs"
import { Button } from "../ui/button"

export default function Navbar() {
  const pathname = usePathname()
  const { isSignedIn } = useUser()
  
  // ダッシュボードページではナビゲーションを表示しない
  if (pathname?.startsWith("/dashboard")) {
    return null
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
          {isSignedIn ? (
            <>
              <Button asChild variant="outline">
                <Link href="/dashboard">ダッシュボード</Link>
              </Button>
              <UserButton afterSignOutUrl="/" />
            </>
          ) : (
            <>
              <Button asChild variant="outline">
                <Link href="/login">ログイン</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">無料登録</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  )
} 