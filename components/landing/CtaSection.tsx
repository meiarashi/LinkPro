"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "../ui/button"

export default function CtaSection() {
  return (
    <section className="py-24 bg-gradient-to-br from-primary/10 via-white to-accent/10 relative overflow-hidden">
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="max-w-3xl mx-auto text-center"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            今すぐ<span className="text-primary">始めましょう</span>
          </h2>
          <p className="text-lg text-gray-700 mb-10">
            登録は無料です。数分で完了します。あなたに最適なパートナーとの出会いをお手伝いします。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" variant="default" className="rounded-full text-base font-bold px-8">
              <Link href="/signup">無料でサインアップ</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full text-base">
              <Link href="/about">サービスについて詳しく</Link>
            </Button>
          </div>
        </motion.div>
      </div>
      
      {/* 背景装飾 */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-primary/5 rounded-full"></div>
        <div className="absolute -top-16 -left-16 w-64 h-64 bg-accent/5 rounded-full"></div>
        <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 w-32 h-32 bg-primary/5 rounded-full"></div>
      </div>
    </section>
  )
} 