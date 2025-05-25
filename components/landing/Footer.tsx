"use client"

import Link from "next/link"

export default function Footer() {
  return (
    <footer className="bg-gray-50 py-12 border-t border-gray-200">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-lg font-bold mb-4 text-primary">LinkPro</h3>
            <p className="text-gray-600 mb-6 max-w-md">
              信頼できるPMとクライアントをつなぐ、新しいマッチングプラットフォーム。
              高品質なプロジェクトマネジメントの実現をサポートします。
            </p>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-900">サービス</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/for-clients" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  クライアント向け
                </Link>
              </li>
              <li>
                <Link href="/for-pms" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  PM向け
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  料金プラン
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  サービス紹介
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-semibold mb-4 text-gray-900">会社情報</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/company" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  会社概要
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  利用規約
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  プライバシーポリシー
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-primary transition-colors text-sm">
                  お問い合わせ
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-200 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500 mb-4 md:mb-0">
            &copy; 2025 LinkPro. All rights reserved.
          </p>
          <div className="flex space-x-6">
            <Link href="https://twitter.com" className="text-gray-500 hover:text-primary">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
              </svg>
            </Link>
            <Link href="https://linkedin.com" className="text-gray-500 hover:text-primary">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
} 