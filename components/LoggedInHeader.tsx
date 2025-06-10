"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { createClient } from "../utils/supabase/client";
import { MessageSquare, Menu, X, Settings } from "lucide-react";
import NotificationCenter from './NotificationCenter';

interface LoggedInHeaderProps {
  userProfile: {
    id: string;
    full_name: string | null;
    user_type: string;
  };
  userEmail?: string;
}

export default function LoggedInHeader({ userProfile, userEmail }: LoggedInHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [unreadCount, setUnreadCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchUnreadCount();
    
    // リアルタイムで未読数を更新
    const channel = supabase
      .channel('header-messages')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${userProfile.id}`,
        },
        () => {
          fetchUnreadCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.id]);

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', userProfile.id)
      .eq('read_status', false);
    
    if (count !== null) {
      setUnreadCount(count);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const NavLink = ({ 
    href, 
    children, 
    isActive 
  }: { 
    href: string; 
    children: React.ReactNode; 
    isActive: boolean;
  }) => (
    <Link
      href={href}
      className={`text-sm font-medium transition-colors hover:text-primary ${
        isActive ? 'text-primary' : 'text-gray-600'
      }`}
      onClick={() => setMobileMenuOpen(false)}
    >
      {children}
    </Link>
  );

  return (
    <header className="bg-white shadow-sm border-b sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* 左側: ロゴとメインナビゲーション */}
          <div className="flex items-center space-x-8">
            <Link href="/dashboard" className="text-xl font-bold text-primary">
              LinkPro
            </Link>
            
            {/* デスクトップナビゲーション */}
            <nav className="hidden md:flex items-center space-x-6">
              <NavLink href="/dashboard" isActive={pathname === '/dashboard'}>
                ダッシュボード
              </NavLink>
              
              {userProfile.user_type === 'pm' && (
                <NavLink href="/projects" isActive={pathname.startsWith('/projects')}>
                  プロジェクトを探す
                </NavLink>
              )}
              
              {userProfile.user_type === 'client' && (
                <NavLink href="/projects/new" isActive={pathname === '/projects/new'}>
                  プロジェクトを作成
                </NavLink>
              )}
              
              <NavLink href="/messages" isActive={pathname.startsWith('/messages')}>
                <span className="flex items-center gap-1">
                  メッセージ
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
              </NavLink>
            </nav>
            
            {/* 通知センター */}
            <NotificationCenter />
          </div>

          {/* 右側: ユーザーメニュー */}
          <div className="flex items-center space-x-4">
            <span className="hidden md:block text-sm text-gray-600">
              {userProfile.full_name || userEmail || 'ユーザー'}
            </span>
            <Link
              href="/settings"
              className="hidden md:flex p-2 text-gray-600 hover:text-gray-900"
              title="設定"
            >
              <Settings className="w-5 h-5" />
            </Link>
            <Button 
              onClick={handleSignOut} 
              variant="outline" 
              size="sm"
              className="hidden md:flex"
            >
              ログアウト
            </Button>

            {/* モバイルメニューボタン */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* モバイルメニュー */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <nav className="flex flex-col space-y-4">
              <NavLink href="/dashboard" isActive={pathname === '/dashboard'}>
                ダッシュボード
              </NavLink>
              
              {userProfile.user_type === 'pm' && (
                <NavLink href="/projects" isActive={pathname.startsWith('/projects')}>
                  プロジェクトを探す
                </NavLink>
              )}
              
              {userProfile.user_type === 'client' && (
                <NavLink href="/projects/new" isActive={pathname === '/projects/new'}>
                  プロジェクトを作成
                </NavLink>
              )}
              
              <NavLink href="/messages" isActive={pathname.startsWith('/messages')}>
                <span className="flex items-center gap-1">
                  メッセージ
                  {unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </span>
              </NavLink>
              
              
              <Link 
                href="/settings" 
                className="text-sm text-gray-600 flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Settings className="w-4 h-4" />
                アカウント設定
              </Link>
              
              <div className="pt-4 border-t">
                <div className="text-sm text-gray-600 mb-2">
                  {userProfile.full_name || userEmail || 'ユーザー'}
                </div>
                <Button 
                  onClick={handleSignOut} 
                  variant="outline" 
                  size="sm"
                  className="w-full"
                >
                  ログアウト
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}