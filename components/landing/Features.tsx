"use client"

import { motion } from "framer-motion"
import { Shield, Puzzle, Coins } from "lucide-react"

const features = [
  {
    title: "AIによる厳格な審査",
    description: "すべてプロフェッショナルとクライアントはAIによる審査を通過。信頼できるパートナーだけが参加できるプラットフォームです。",
    icon: Shield,
    color: "bg-blue-50",
    iconColor: "text-primary"
  },
  {
    title: "独自の指向性チェックで最適なマッチング",
    description: "プロジェクトの成功率を高める、詳細な指向性チェックによる相性の良いパートナー探し。",
    icon: Puzzle,
    color: "bg-purple-50",
    iconColor: "text-purple-600"
  },
  {
    title: "中間マージンなし",
    description: "サブスクリプション料金のみ。余計な仲介手数料はかかりません。直接つながるから効率的。",
    icon: Coins,
    color: "bg-green-50",
    iconColor: "text-green-600"
  }
]

export default function Features() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  }
  
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  }

  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            LinkProの<span className="text-primary">3つの強み</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            高い成約率と満足度を実現する、私たちのユニークな特徴をご紹介します
          </p>
        </motion.div>

        <motion.div 
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={item}
              className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className={`${feature.color} p-4 rounded-full inline-block mb-6`}>
                <feature.icon className={`w-6 h-6 ${feature.iconColor}`} />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
} 