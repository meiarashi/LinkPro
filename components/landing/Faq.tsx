"use client"

import { motion } from "framer-motion"

const faqItems = [
  {
    question: "LinkProとはどのようなサービスですか？",
    answer:
      "LinkProは、プロジェクトを成功に導きたい企業と、スキルを活かしたいプロフェッショナルなPM（プロジェクトマネージャー）を繋ぐマッチングプラットフォームです。",
  },
  {
    question: "利用料金はかかりますか？",
    answer:
      "基本的なプラットフォームの利用は無料です。PMとの契約が成立した場合に、手数料が発生する場合があります。詳細な料金プランについては、料金ページをご確認ください。",
  },
  {
    question: "どのようなPMが登録していますか？",
    answer:
      "LinkProには、様々な業界・規模のプロジェクト経験を持つ、厳選されたPMが登録しています。IT、製造、建設、コンサルティングなど、幅広い分野の専門家がいます。",
  },
  {
    question: "どのようにしてPMとマッチングしますか？",
    answer:
      "企業はプロジェクトの概要や求めるPMのスキルを登録し、PMは自身のスキルや経験を登録します。LinkProのアルゴリズムや検索機能を通じて、最適なマッチングを支援します。また、企業からPMへ直接スカウトすることも可能です。",
  },
  {
    question: "契約や支払いはどのように行われますか？",
    answer:
      "契約条件は企業とPM間で直接合意していただきます。LinkProは契約締結や支払いプロセスの円滑化をサポートする機能を提供する予定です。",
  },
];

export default function Faq() {
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
            よくあるご質問
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            サービス利用に関する疑問点を解消します
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1}}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }} 
          className="max-w-3xl mx-auto space-y-6"
        >
          {faqItems.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0}}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-white p-6 rounded-lg shadow-md"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {item.question}
              </h3>
              <p className="text-gray-700">
                {item.answer}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
} 