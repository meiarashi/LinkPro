"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "../ui/button"

export default function Hero() {
  return (
    <section className="bg-gradient-to-b from-primary/5 via-transparent to-transparent py-20 md:py-32">
      <div className="container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            最高のPMと出会い、<br />
            プロジェクトを<span className="text-primary">成功</span>に導く
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-2xl mx-auto mb-10">
            LinkProは、厳選されたプロフェッショナルなPMと、プロジェクトを成功させたい企業をつなぐマッチングプラットフォームです。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="rounded-full text-lg font-bold px-12 py-3">
              <Link href="/signup?type=client">クライアントとして登録</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full text-lg px-12 py-3">
              <Link href="/signup?type=pm">PMとして登録</Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
} 