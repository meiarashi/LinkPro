import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini API初期化
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY environment variable is not set');
  throw new Error('GEMINI_API_KEY is required but not configured');
}
const genAI = new GoogleGenerativeAI(apiKey);

export async function POST(request: NextRequest) {
  try {
    // APIキーの確認（初期化時にチェック済みだが、念のため再確認）
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API configuration error', details: 'GEMINI_API_KEY is not configured' },
        { status: 500 }
      );
    }
    
    const { messages, currentProjectInfo } = await request.json();
    
    // Gemini 2.0 Flash Experimental モデルを使用
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

2. project_difficulty: プロジェクト難易度
   - "beginner": 1-2ヶ月程度の簡易案件
   - "intermediate": 3-6ヶ月程度の標準案件
   - "advanced": 6ヶ月以上の大規模案件

3. project_type: プロジェクトタイプ
   例: "development", "training", "consulting", "operation"

4. estimated_budget_range: 予算感
   例: { min: 500000, max: 2000000 }

5. key_requirements: 重要な要件（3-5個）
   例: ["営業部門20名への研修", "プロンプトテンプレート作成", "月次サポート"]

6. success_criteria: 成功基準
   例: ["メール作成時間50%削減", "提案書品質向上"]

7. project_story: プロジェクトストーリー（重要！）
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
    
    console.log('Gemini response:', text); // デバッグ用ログ
    
    // JSONを抽出（Geminiの出力からJSON部分を取り出す）
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('Failed to extract JSON from response:', text);
      throw new Error('Failed to extract JSON from response');
    }
    
    let analysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      console.error('JSON string:', jsonMatch[0]);
      throw new Error('Failed to parse JSON response');
    }
    
    // pro_requirements形式に変換（必要な項目のみ）
    const proRequirements = {
      required_ai_level: analysis.required_ai_level,
      project_difficulty: analysis.project_difficulty
    };
    
    // 不要なフィールドを削除した分析結果
    const cleanedAnalysis = {
      required_ai_level: analysis.required_ai_level,
      project_difficulty: analysis.project_difficulty,
      project_type: analysis.project_type,
      estimated_budget_range: analysis.estimated_budget_range,
      key_requirements: analysis.key_requirements,
      success_criteria: analysis.success_criteria,
      project_story: analysis.project_story
    };
    
    return NextResponse.json({
      success: true,
      analysis: cleanedAnalysis,
      proRequirements,
      // 次の質問の提案
      suggestedQuestions: generateFollowUpQuestions(cleanedAnalysis)
    });
    
  } catch (error) {
    console.error('Project analysis error:', error);
    
    // エラーメッセージの詳細を返す
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const errorDetails = {
      error: 'Failed to analyze project requirements',
      message: errorMessage,
      details: error instanceof Error ? error.stack : undefined
    };
    
    return NextResponse.json(errorDetails, { status: 500 });
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