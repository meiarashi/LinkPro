"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: "LinkProはどのようなサービスですか？",
    answer: "LinkProは、AI人材と企業をマッチングするプラットフォームです。企業のAIプロジェクトに最適な人材を見つけ、プロジェクトの成功をサポートします。"
  },
  {
    question: "利用料金はどのようになっていますか？",
    answer: "プロジェクトの掲載は無料です。マッチング成立時に、契約金額の一定割合を手数料としていただきます。詳細は料金ページをご覧ください。"
  },
  {
    question: "どのようなAI人材が登録していますか？",
    answer: "機械学習エンジニア、データサイエンティスト、AIコンサルタント、プロンプトエンジニアなど、幅広いAI関連のスキルを持つ人材が登録しています。"
  },
  {
    question: "プロジェクトの期間はどのくらいですか？",
    answer: "プロジェクトの期間は案件により異なります。短期の1週間程度のものから、長期の1年以上のプロジェクトまで様々です。"
  },
  {
    question: "契約や支払いはどのように行われますか？",
    answer: "LinkProのプラットフォーム上で安全に契約を締結し、エスクロー決済により支払いを管理します。これにより、両者にとって安全な取引が可能です。"
  },
  {
    question: "AIアドバイザー機能とは何ですか？",
    answer: "AIアドバイザーは、プロジェクトの要件定義から人材選定まで、AIを活用してサポートする機能です。対話形式で要件を整理し、最適な提案を行います。"
  }
];

export default function FAQPage() {
  const [openItems, setOpenItems] = useState<number[]>([]);

  const toggleItem = (index: number) => {
    setOpenItems(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">よくある質問</h1>
      
      <div className="space-y-4">
        {faqItems.map((item, index) => (
          <div key={index} className="border rounded-lg">
            <button
              className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
              onClick={() => toggleItem(index)}
            >
              <span className="font-medium">{item.question}</span>
              {openItems.includes(index) ? (
                <ChevronUp className="w-5 h-5 text-gray-500" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-500" />
              )}
            </button>
            {openItems.includes(index) && (
              <div className="px-6 pb-4">
                <p className="text-gray-600">{item.answer}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 bg-blue-50 rounded-lg">
        <h2 className="text-xl font-semibold mb-2">その他のご質問</h2>
        <p className="text-gray-600">
          ここに記載されていないご質問がございましたら、
          お問い合わせフォームまたはsupport@linkpro.jpまでお気軽にご連絡ください。
        </p>
      </div>
    </div>
  );
}