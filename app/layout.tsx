import './globals.css'
import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { jaJP } from '@clerk/localizations'
import Navbar from '../components/landing/Navbar'

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-noto-sans-jp',
  weight: ['400', '500', '700'],
})

export const metadata: Metadata = {
  title: 'LinkPro - クライアント・PMマッチングプラットフォーム',
  description: '信頼できるPMとクライアントをつなぐ、新しいマッチングプラットフォーム',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider localization={jaJP} appearance={{
      elements: {
        formButtonPrimary: "bg-primary hover:bg-primary/90 text-white",
        footerActionLink: "text-primary hover:text-primary/90"
      }
    }}>
      <html lang="ja">
        <body className={`${notoSansJP.variable} font-sans`}>
          <Navbar />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
} 