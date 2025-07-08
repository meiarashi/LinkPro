-- ステップ4: 初期データの投入

-- =====================================================
-- プロジェクトテンプレートの初期データ
-- =====================================================

INSERT INTO public.project_templates (skill_level, category, title, description_template, typical_requirements, typical_duration, budget_range, sample_deliverables, required_skills) VALUES
-- エキスパート向けテンプレート
('expert', 'ml_development', '機械学習モデル開発', 
 'ビジネス課題を解決するための機械学習モデルの開発をお願いします。データの前処理から、モデルの学習、評価、デプロイまでの一連の作業を含みます。',
 '{"data_size": "100万件以上", "accuracy_target": "90%以上", "deployment": "本番環境へのデプロイ"}',
 '3-6ヶ月',
 '{"min": 3000000, "max": 10000000}',
 ARRAY['学習済みモデル', 'APIエンドポイント', '技術ドキュメント', '性能評価レポート'],
 ARRAY['Python', 'TensorFlow/PyTorch', 'MLOps', 'クラウドプラットフォーム']),

-- 開発者向けテンプレート
('developer', 'chatbot_development', 'AIチャットボット開発',
 'ChatGPT APIを活用した業務用チャットボットの開発をお願いします。自社の業務知識を学習させ、社内問い合わせ対応を自動化したいです。',
 '{"integration": "既存システムとの連携", "customization": "業務特化のカスタマイズ", "ui": "Webインターフェース"}',
 '1-3ヶ月',
 '{"min": 1000000, "max": 3000000}',
 ARRAY['チャットボットシステム', 'APIドキュメント', '運用マニュアル', 'ソースコード'],
 ARRAY['ChatGPT API', 'Python/JavaScript', 'Web開発', 'データベース']),

('developer', 'automation_tool', 'AI業務自動化ツール開発',
 'AIを活用した業務プロセス自動化ツールの開発をお願いします。定型的な作業をAIで効率化し、生産性を向上させたいです。',
 '{"process_analysis": "業務プロセス分析", "integration": "既存ツールとの連携", "ui": "使いやすいUI"}',
 '2-4ヶ月',
 '{"min": 1500000, "max": 4000000}',
 ARRAY['自動化ツール', '設定マニュアル', 'トレーニング資料', '保守ドキュメント'],
 ARRAY['Python', 'RPA', 'AI API', 'プロセス自動化']),

-- 活用者向けテンプレート
('user', 'content_creation', 'AI活用コンテンツ制作支援',
 'ChatGPTやClaudeを活用した効率的なコンテンツ制作の支援をお願いします。プロンプトエンジニアリングによる品質向上と、作業効率化を実現したいです。',
 '{"content_type": "ブログ記事、SNS投稿、プレスリリース", "volume": "月間50本程度", "quality": "人間レベルの品質"}',
 '1ヶ月〜継続',
 '{"min": 300000, "max": 800000}',
 ARRAY['プロンプトテンプレート集', 'コンテンツ制作ガイドライン', 'サンプルコンテンツ', '効果測定レポート'],
 ARRAY['ChatGPT/Claude', 'プロンプトエンジニアリング', 'コンテンツマーケティング']),

('user', 'data_analysis', 'AIデータ分析支援',
 'ChatGPTやClaudeを活用したデータ分析業務の効率化をお願いします。分析レポートの自動生成や、インサイトの抽出を支援してください。',
 '{"data_type": "売上データ、顧客データ", "frequency": "週次/月次レポート", "visualization": "グラフ・チャート作成"}',
 '1-2ヶ月',
 '{"min": 500000, "max": 1500000}',
 ARRAY['分析テンプレート', 'レポート自動化スクリプト', '可視化ダッシュボード', '分析ガイド'],
 ARRAY['ChatGPT/Claude', 'データ分析', 'Excel/Google Sheets', 'プロンプト設計']),

-- 支援者向けテンプレート
('supporter', 'ai_consulting', 'AI導入コンサルティング',
 '自社へのAI導入に向けた戦略立案と実行支援をお願いします。現状分析から、導入計画の策定、POCの実施、社内教育まで包括的な支援を求めています。',
 '{"assessment": "現状分析とギャップ分析", "roadmap": "段階的導入計画", "education": "社員向け研修"}',
 '3-6ヶ月',
 '{"min": 2000000, "max": 5000000}',
 ARRAY['AI導入戦略書', '導入ロードマップ', 'POC結果レポート', '研修資料'],
 ARRAY['AI戦略立案', 'プロジェクトマネジメント', '研修講師経験', '業界知識']),

('supporter', 'ai_training', 'AI活用研修・トレーニング',
 '社員向けのAI活用研修を実施していただきたいです。ChatGPTやClaudeなどのAIツールを業務で効果的に活用できるよう、実践的な研修をお願いします。',
 '{"target_audience": "全社員向け/部門別", "skill_level": "初級〜中級", "format": "オンライン/対面"}',
 '1-3ヶ月',
 '{"min": 500000, "max": 2000000}',
 ARRAY['研修カリキュラム', '教材・テキスト', '演習課題', '理解度テスト'],
 ARRAY['AI教育', 'プレゼンテーション', 'カリキュラム設計', '実践指導']);

-- =====================================================
-- 実行後の確認
-- =====================================================

-- テーブルが正しく作成されたか確認
-- SELECT table_name FROM information_schema.tables 
-- WHERE table_schema = 'public' 
-- AND table_name IN ('ai_skills', 'matching_scores', 'ai_use_cases', 'project_templates');

-- 初期データが投入されたか確認
-- SELECT COUNT(*) as template_count FROM public.project_templates;
-- SELECT skill_level, category, title FROM public.project_templates ORDER BY skill_level;