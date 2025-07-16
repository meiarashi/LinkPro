import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API初期化
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { messages, currentProjectInfo } = await request.json();
    
    // Gemini 2.0 Flash モデルを使用
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // プロンプトの構築
    const prompt = `
あなたはAI人材マッチングプラットフォームのアシスタントです。
クライアントとの対話から、プロジェクト要件を分析してください。

## 対話内容
${messages.map((m: any) => `${m.role}: ${m.content}`).join('\n')}

## 現在のプロジェクト情報
${JSON.stringify(currentProjectInfo, null, 2)}

## 分析してほしい項目
1. required_ai_level: 必要なAI人材レベル
   - "expert": ML/DL開発が必要な高度な案件
   - "developer": API活用やシステム開発が必要
   - "user": ChatGPT等の活用支援や業務効率化
   - "supporter": 導入支援や研修など

2. required_ai_tools: 必要になりそうなAIツール（配列）
   例: ["ChatGPT", "Claude", "Python", "LangChain"]

3. business_domain: 業務領域
   例: "営業支援", "マーケティング", "業務効率化", "教育・研修"

4. project_difficulty: プロジェクト難易度
   - "beginner": 1-2ヶ月程度の簡易案件
   - "intermediate": 3-6ヶ月程度の標準案件
   - "advanced": 6ヶ月以上の大規模案件

5. project_type: プロジェクトタイプ
   例: "development", "training", "consulting", "operation"

6. estimated_budget_range: 予算感
   例: { min: 500000, max: 2000000 }

7. key_requirements: 重要な要件（3-5個）
   例: ["営業部門20名への研修", "プロンプトテンプレート作成", "月次サポート"]

8. success_criteria: 成功基準
   例: ["メール作成時間50%削減", "提案書品質向上"]

9. project_story: プロジェクトストーリー（重要！）
   以下の構成で、魅力的なプロジェクト説明文を作成してください：
   
   【背景】
   なぜこのプロジェクトが必要なのか、どんな状況に直面しているか
   
   【課題】
   具体的にどんな問題があり、それによってどんな影響が出ているか
   
   【解決策】
   AIを活用してどのように解決するか、具体的なアプローチ
   
   【期待される成果】
   プロジェクト実施後に期待される具体的な変化や効果
   
   ※ 単なる要件の箇条書きではなく、読み手が「このプロジェクトに参加したい」と思えるような、ストーリー性のある文章にしてください。

## 出力形式
JSON形式で出力してください。
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // JSONを抽出（Geminiの出力からJSON部分を取り出す）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);
    
    // pro_requirements形式に変換
    const proRequirements = {
      required_ai_level: analysis.required_ai_level,
      required_ai_tools: analysis.required_ai_tools,
      business_domain: analysis.business_domain,
      project_difficulty: analysis.project_difficulty,
      // 追加情報も保存
      project_type: analysis.project_type,
      key_requirements: analysis.key_requirements,
      success_criteria: analysis.success_criteria,
      estimated_budget: analysis.estimated_budget_range
    };
    
    return NextResponse.json({
      success: true,
      analysis,
      proRequirements,
      // 次の質問の提案
      suggestedQuestions: generateFollowUpQuestions(analysis)
    });
    
  } catch (error) {
    console.error('Project analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze project requirements' },
      { status: 500 }
    );
  }
}

// フォローアップ質問の生成
function generateFollowUpQuestions(analysis: any): string[] {
  const questions: string[] = [];
  
  // 必要な情報が不足している場合の質問を生成
  if (!analysis.estimated_budget_range) {
    questions.push('ご予算の規模感を教えていただけますか？\n（例：50-100万円、200万円以上など）');
  }
  
  if (!analysis.key_requirements || analysis.key_requirements.length < 3) {
    questions.push('具体的に実現したいことを教えていただけますか？\n（例：メール作成の効率化、データ分析の自動化など）');
  }
  
  if (analysis.project_type === 'training' && !analysis.team_size) {
    questions.push('研修の対象者は何名程度を想定されていますか？\n（例：営業部門20名、全社員100名など）');
  }
  
  return questions;
}