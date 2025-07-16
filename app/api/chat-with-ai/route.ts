import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
  try {
    const { messages, currentAnalysis } = await request.json();
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    
    // 対話の文脈を理解して、適切な応答を生成
    const prompt = `
あなたはAI人材マッチングプラットフォームのアシスタントです。
クライアントとの対話を通じて、プロジェクト要件を明確化する必要があります。

## これまでの対話
${messages.map((m: any) => `${m.role === 'user' ? 'クライアント' : 'アシスタント'}: ${m.content}`).join('\n')}

## 現在の分析状態
${JSON.stringify(currentAnalysis, null, 2)}

## あなたのタスク
1. クライアントの最新の発言を理解し、自然な応答を生成してください
2. まだ不明確な要件があれば、具体的な質問をしてください
3. 十分な情報が集まったら、要件のサマリーを提示してください

## 重要な情報を収集するポイント
- 解決したい課題（必須）
- 対象人数・規模
- 期待する成果
- 予算感
- 期限
- 必要なAIツールやスキルレベル

## 応答ルール
- 親切で分かりやすい日本語で応答
- 専門用語は避ける
- 具体例を示す
- 1つの応答に含める質問は1-2個まで
- クライアントの発言が要件と関係ない場合は、優しく本題に戻す

## 応答形式
通常の会話形式で応答してください。JSONではありません。
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiMessage = response.text();
    
    // 要件が十分に集まったかチェック
    const completenessCheck = await checkRequirementCompleteness(messages, currentAnalysis);
    
    return NextResponse.json({
      success: true,
      message: aiMessage,
      isComplete: completenessCheck.isComplete,
      missingInfo: completenessCheck.missingInfo
    });
    
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { error: 'Failed to generate response' },
      { status: 500 }
    );
  }
}

async function checkRequirementCompleteness(messages: any[], analysis: any) {
  const required = ['project_type', 'business_domain', 'key_requirements'];
  const missing = required.filter(field => !analysis[field] || 
    (Array.isArray(analysis[field]) && analysis[field].length === 0));
  
  return {
    isComplete: missing.length === 0 && messages.length > 4,
    missingInfo: missing
  };
}