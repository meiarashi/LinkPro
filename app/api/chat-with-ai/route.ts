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

## 応答の例
良い例：
「営業部門でのChatGPT活用ですね。

現在、どのような営業活動で課題を感じていらっしゃいますか？

例えば：
• メール作成に時間がかかる
• 提案書の品質にばらつきがある
• 顧客情報の整理が大変

具体的な課題を教えていただけると、最適な解決策をご提案できます。」

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

## 応答フォーマット
- 段落ごとに適切に改行を入れる
- 箇条書きを使う場合は「・」や「•」を使用
- 長い文章は2-3文で改行
- 質問は独立した段落で

## 応答形式
通常の会話形式で応答してください。JSONではありません。
読みやすさを重視し、適切な改行を含めてください。
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