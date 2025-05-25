import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// パブリックルート（認証不要のページ）
const publicPaths = [
  "/",
  "/login(.*)",  // ログインページとその子ルート全て
  "/signup(.*)", // サインアップページとその子ルート全て
  "/about",
  "/pricing",
  "/for-clients",
  "/for-pms",
  "/contact",
  "/terms",
  "/privacy",
  "/company",
  "/sso-callback"
];

// API経路
const apiPaths = ["/api(.*)"];

// パブリックルートかチェックするマッチャーを作成
const isPublic = createRouteMatcher([...publicPaths, ...apiPaths]);

export default function middleware(req: NextRequest) {
  // リクエストがパブリックルートの場合はスキップ
  if (isPublic(req)) {
    return NextResponse.next();
  }

  // それ以外の場合はClerkのミドルウェアを適用
  return clerkMiddleware()(req);
}

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}; 