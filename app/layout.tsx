import './globals.css'
import type { Metadata } from 'next'
import { Noto_Sans_JP } from 'next/font/google'
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
    <html lang="ja">
      <body className={`${notoSansJP.variable} font-sans`}>
        <Navbar />
        {children}
      </body>
    </html>
  )
} 