"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Button } from "../ui/button"
import { Building, Users } from "lucide-react"

export default function UserTypes() {
  return (
    <section className="py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            あなたに最適な<span className="text-primary">ユーザー体験</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            クライアントとプロフェッショナル、それぞれのニーズに合わせた機能を提供します
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* クライアント向け */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl overflow-hidden shadow-lg"
          >
            <div className="bg-primary/10 p-8">
              <div className="bg-white p-4 rounded-full inline-block mb-4">
                <Building className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-2">プロジェクトを成功に導くプロフェッショナルをお探しの方へ</h3>
              <p className="text-gray-700">
                厳選されたプロフェッショナルとつながり、プロジェクトを確実に前進させましょう。
              </p>
            </div>
            <div className="p-8">
              <h4 className="font-semibold mb-4 text-gray-900">こんな方におすすめ</h4>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>スタートアップ企業の経営者・役員</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>中小企業のIT担当責任者</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>大企業の事業部門責任者</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2">•</span>
                  <span>新規プロジェクトの立ち上げ担当者</span>
                </li>
              </ul>
              <Button asChild variant="default" className="w-full text-lg px-10 py-3 font-semibold">
                <Link href="/signup?type=client">クライアントとして登録</Link>
              </Button>
            </div>
          </motion.div>

          {/* プロフェッショナル向け */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-white rounded-xl overflow-hidden shadow-lg"
          >
            <div className="bg-accent/10 p-8">
              <div className="bg-white p-4 rounded-full inline-block mb-4">
                <Users className="w-8 h-8 text-accent" />
              </div>
              <h3 className="text-2xl font-bold mb-2">スキルを活かせるプロジェクトをお探しのプロフェッショナルへ</h3>
              <p className="text-gray-700">
                あなたの経験とスキルにマッチする魅力的なプロジェクトと出会えます。
              </p>
            </div>
            <div className="p-8">
              <h4 className="font-semibold mb-4 text-gray-900">こんな方におすすめ</h4>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  <span>ITプロジェクト管理経験者</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  <span>フリーランスのプロフェッショナル</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  <span>副業・複業としてプロジェクト管理業務を行いたい方</span>
                </li>
                <li className="flex items-start">
                  <span className="text-accent mr-2">•</span>
                  <span>キャリアアップを目指すプロフェッショナル</span>
                </li>
              </ul>
              <Button asChild variant="accent" className="w-full text-lg px-10 py-3 font-semibold">
                <Link href="/signup?type=pro">プロフェッショナルとして登録</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
} 