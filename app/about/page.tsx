export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">LinkProについて</h1>
      
      <div className="space-y-6">
        <section>
          <h2 className="text-2xl font-semibold mb-3">私たちのミッション</h2>
          <p className="text-gray-600">
            LinkProは、AI人材と企業をつなぐマッチングプラットフォームです。
            最適なAI人材を見つけ、プロジェクトを成功に導きます。
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">サービスの特徴</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-600">
            <li>AIスキルに特化した人材データベース</li>
            <li>プロジェクト要件に基づく自動マッチング</li>
            <li>AIアドバイザーによるプロジェクト支援</li>
            <li>安全な契約・支払いシステム</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">会社情報</h2>
          <div className="text-gray-600 space-y-1">
            <p>会社名: LinkPro株式会社</p>
            <p>設立: 2024年</p>
            <p>所在地: 東京都</p>
          </div>
        </section>
      </div>
    </div>
  );
}