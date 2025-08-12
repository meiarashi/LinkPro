import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'
  
  // エラーチェック
  const error = searchParams.get('error')
  if (error) {
    console.error('OAuth error:', error)
    const errorDescription = searchParams.get('error_description')
    return NextResponse.redirect(`${origin}/login?error=${error}&message=${errorDescription}`)
  }

  if (code) {
    const supabase = createClient()
    
    // 認証コードをセッションに交換
    const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!sessionError) {
      // ユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // ユーザータイプを取得（サインアップ時に渡される）
        const userType = searchParams.get('type')
        
        // プロフィールをチェック
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id, user_type')
          .eq('id', user.id)
          .single()
        
        // プロフィールが存在しない場合（新規ユーザー）
        if (profileError && profileError.code === 'PGRST116') {
          // 新規プロフィールを作成
          if (userType) {
            const { error: insertError } = await supabase
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
              })
            
            if (insertError) {
              console.error('Error creating profile:', insertError)
              // プロフィール作成に失敗した場合、エラーメッセージと共にログインページへリダイレクト
              return NextResponse.redirect(`${origin}/login?error=profile_creation_failed&message=${encodeURIComponent(insertError.message)}`)
            }
            
            // Proユーザーは直接プロフィール編集へ、Clientはオンボーディングへ
            if (userType === 'pro') {
              return NextResponse.redirect(`${origin}/profile/edit`)
            } else {
              return NextResponse.redirect(`${origin}/onboarding?type=${userType}`)
            }
          }
        }
        
        // 既存ユーザーまたはプロフィール作成後はダッシュボードへ
        const redirectUrl = searchParams.get('redirect_url') ?? '/dashboard'
        return NextResponse.redirect(`${origin}${redirectUrl}`)
      }
    } else {
      console.error('Session exchange error:', sessionError)
      return NextResponse.redirect(`${origin}/login?error=session_error&message=${sessionError.message}`)
    }
  }

  // 認証コードがない場合
  return NextResponse.redirect(`${origin}/login?error=no_code`)
}