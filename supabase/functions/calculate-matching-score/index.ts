import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface MatchingRequest {
  projectId: string
  proId?: string // 特定のプロ人材のみ計算する場合
}

// スキルレベルの階層
const SKILL_LEVELS = {
  expert: 4,
  developer: 3,
  user: 2,
  supporter: 1
}

// 関連AIツールのマッピング
const RELATED_TOOLS = {
  'ChatGPT': ['Claude', 'Gemini', 'Copilot'],
  'Claude': ['ChatGPT', 'Gemini'],
  'Python': ['JavaScript', 'R'],
  'TensorFlow': ['PyTorch', 'Keras'],
  'Midjourney': ['Stable Diffusion', 'DALL-E']
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { projectId, proId } = await req.json() as MatchingRequest

    // プロジェクト情報を取得
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*, client:profiles!projects_client_id_fkey(*)')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      throw new Error('Project not found')
    }

    const requirements = project.pro_requirements || {}

    // 対象となるプロ人材を取得
    let proQuery = supabase
      .from('profiles')
      .select('*')
      .eq('user_type', 'pro')

    if (proId) {
      proQuery = proQuery.eq('id', proId)
    }

    const { data: profiles, error: profilesError } = await proQuery

    if (profilesError || !profiles || profiles.length === 0) {
      throw new Error('No profiles found')
    }

    // 各プロ人材のスコアを計算
    const matchingScores = []
    
    for (const profile of profiles) {
      const profileDetails = profile.profile_details || {}
      const scores = calculateScore(requirements, profileDetails, profile)
      
      // 既存のスコアを削除
      await supabase
        .from('matching_scores')
        .delete()
        .match({ project_id: projectId, ai_talent_id: profile.id })

      // 新しいスコアを保存
      const { error: insertError } = await supabase
        .from('matching_scores')
        .insert({
          project_id: projectId,
          ai_talent_id: profile.id,
          pro_id: profile.id, // 互換性のために両方設定
          ...scores,
          match_percentage: Math.round(scores.total_score),
          recommendation_reason: generateReason(scores, requirements, profileDetails),
          match_details: {
            required_level: requirements.required_ai_level,
            profile_level: profileDetails.ai_skills?.[0],
            matched_tools: requirements.required_ai_tools?.filter((tool: string) => 
              profileDetails.ai_tools?.includes(tool)
            ) || []
          }
        })

      if (!insertError) {
        matchingScores.push({
          pro_id: profile.id,
          pro_name: profile.full_name,
          ...scores
        })
      }
    }

    // スコアの高い順にソート
    matchingScores.sort((a, b) => b.total_score - a.total_score)

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchingScores: matchingScores.slice(0, 10) // 上位10件を返す
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

function calculateScore(requirements: any, profileDetails: any, profile: any) {
  let scores = {
    level_match_score: 0,
    tool_match_score: 0,
    domain_match_score: 0,
    experience_score: 0,
    availability_score: 0,
    total_score: 0
  }

  // 1. レベルマッチスコア（30点満点）
  const requiredLevel = requirements.required_ai_level
  const profileLevel = profileDetails.ai_skills?.[0] // 最初のスキルをメインレベルとする
  
  if (requiredLevel && profileLevel) {
    if (requiredLevel === profileLevel) {
      scores.level_match_score = 30 // 完全一致
    } else if (SKILL_LEVELS[profileLevel] > SKILL_LEVELS[requiredLevel]) {
      scores.level_match_score = 25 // 上位レベル
    } else if (SKILL_LEVELS[profileLevel] === SKILL_LEVELS[requiredLevel] - 1) {
      scores.level_match_score = 15 // 1つ下のレベル
    } else {
      scores.level_match_score = 5 // レベル差が大きい
    }
  }

  // 2. ツールマッチスコア（25点満点）
  const requiredTools = requirements.required_ai_tools || []
  const profileTools = profileDetails.ai_tools || []
  
  if (requiredTools.length > 0) {
    const matchedTools = requiredTools.filter((tool: string) => 
      profileTools.includes(tool)
    )
    const matchRate = matchedTools.length / requiredTools.length
    scores.tool_match_score = Math.round(25 * matchRate)
    
    // 関連ツールボーナス（最大5点）
    let relatedBonus = 0
    for (const reqTool of requiredTools) {
      if (!profileTools.includes(reqTool)) {
        const related = RELATED_TOOLS[reqTool] || []
        if (related.some((t: string) => profileTools.includes(t))) {
          relatedBonus += 2.5
        }
      }
    }
    scores.tool_match_score = Math.min(25, scores.tool_match_score + relatedBonus)
  } else {
    scores.tool_match_score = 20 // ツール指定なしの場合
  }

  // 3. 業務領域スコア（20点満点）
  const businessDomain = requirements.business_domain
  const profileDomains = profileDetails.ai_experience?.domains || []
  
  if (businessDomain && profileDomains.includes(businessDomain)) {
    scores.domain_match_score = 20 // 完全一致
  } else if (profileDomains.length > 0) {
    scores.domain_match_score = 10 // 他の領域の経験あり
  } else {
    scores.domain_match_score = 5 // 経験なし
  }

  // 4. 経験年数スコア（15点満点）
  const experienceYears = profileDetails.ai_experience?.years || 0
  const difficulty = requirements.project_difficulty || 'intermediate'
  
  const idealYears = {
    beginner: 0.5,
    intermediate: 1.5,
    advanced: 3
  }
  
  if (experienceYears >= idealYears[difficulty]) {
    scores.experience_score = 15 // 十分な経験
  } else if (experienceYears >= idealYears[difficulty] * 0.7) {
    scores.experience_score = 10 // やや不足
  } else {
    scores.experience_score = 5 // 経験不足
  }

  // 5. 稼働可能性スコア（10点満点）
  // MVPでは全員を「稼働可能」として扱う
  scores.availability_score = 10

  // 合計スコア
  scores.total_score = 
    scores.level_match_score +
    scores.tool_match_score +
    scores.domain_match_score +
    scores.experience_score +
    scores.availability_score

  return scores
}

function generateReason(scores: any, requirements: any, profileDetails: any): string {
  const reasons = []
  
  if (scores.level_match_score >= 25) {
    reasons.push('スキルレベルが要件に適合')
  }
  
  if (scores.tool_match_score >= 20) {
    const tools = requirements.required_ai_tools?.filter((tool: string) => 
      profileDetails.ai_tools?.includes(tool)
    )
    if (tools?.length > 0) {
      reasons.push(`${tools.join('、')}の経験あり`)
    }
  }
  
  if (scores.domain_match_score >= 15) {
    reasons.push(`${requirements.business_domain || '関連業界'}での実績あり`)
  }
  
  if (scores.experience_score >= 10) {
    reasons.push(`${profileDetails.ai_experience?.years || 0}年のAI活用経験`)
  }
  
  return reasons.length > 0 
    ? reasons.join('。') + '。'
    : 'プロジェクトに対応可能な人材です。'
}