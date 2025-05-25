import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
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
  "/sso-callback",
  "/api(.*)" // API経路もパブリックとして扱う
];

const isPublicRoute = createRouteMatcher(publicPaths);

export default clerkMiddleware((auth, req: NextRequest) => {
  if (!isPublicRoute(req)) {
    // パブリックルートでない場合は認証を要求
    auth.protect(); // Changed from auth().protect()
  }
  // パブリックルートの場合は何もしない（NextResponse.next() は Clerk が内部で処理）
});

export const config = {
  matcher: ['/((?!.+\.[\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}; 