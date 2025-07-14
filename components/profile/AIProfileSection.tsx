"use client";

import { useState } from "react";
import { AISkillType, AITool, AI_SKILLS, SKILL_CATEGORIES } from "../../types/ai-talent";
import { ChevronDown, Info } from "lucide-react";

interface AIProfileSectionProps {
  aiSkills: AISkillType[];
  aiTools: string[];
  aiExperience: {
    years: number;
    domains: string[];
    achievements: string[];
  };
  aiAchievements: string;
  portfolioUrl: string;
  onAISkillsChange: (skills: AISkillType[]) => void;
  onAIToolsChange: (tools: string[]) => void;
  onAIExperienceChange: (experience: any) => void;
  onAIAchievementsChange: (achievements: string) => void;
  onPortfolioUrlChange: (url: string) => void;
}

// 人気のAIツールリスト
const POPULAR_AI_TOOLS: AITool[] = [
  "ChatGPT",
  "Claude",
  "GitHub Copilot",
  "Midjourney",
  "Stable Diffusion",
  "DALL-E",
  "Gemini",
  "Perplexity",
  "LangChain",
  "OpenAI API",
  "Anthropic API",
  "Hugging Face",
  "Runway",
  "ElevenLabs",
  "Jasper AI",
];

// 業務領域
const BUSINESS_DOMAINS = [
  "営業支援",
  "マーケティング",
  "コンテンツ生成",
  "業務効率化",
  "データ分析",
  "カスタマーサポート",
  "開発支援",
  "デザイン制作",
  "教育・研修",
  "研究開発",
];

export default function AIProfileSection({
  aiSkills,
  aiTools,
  aiExperience,
  aiAchievements,
  portfolioUrl,
  onAISkillsChange,
  onAIToolsChange,
  onAIExperienceChange,
  onAIAchievementsChange,
  onPortfolioUrlChange,
}: AIProfileSectionProps) {
  const [showSkillInfo, setShowSkillInfo] = useState(false);
  const [otherToolInput, setOtherToolInput] = useState("");

  const handleSkillToggle = (skill: AISkillType) => {
    if (aiSkills.includes(skill)) {
      onAISkillsChange(aiSkills.filter((s) => s !== skill));
    } else {
      onAISkillsChange([...aiSkills, skill]);
    }
  };

  const handleToolToggle = (tool: string) => {
    if (aiTools.includes(tool)) {
      onAIToolsChange(aiTools.filter((t) => t !== tool));
    } else {
      onAIToolsChange([...aiTools, tool]);
    }
  };

  const handleDomainToggle = (domain: string) => {
    const currentDomains = aiExperience.domains || [];
    if (currentDomains.includes(domain)) {
      onAIExperienceChange({
        ...aiExperience,
        domains: currentDomains.filter((d) => d !== domain),
      });
    } else {
      onAIExperienceChange({
        ...aiExperience,
        domains: [...currentDomains, domain],
      });
    }
  };

  const handleAchievementChange = (index: number, value: string) => {
    const newAchievements = [...(aiExperience.achievements || [])];
    newAchievements[index] = value;
    onAIExperienceChange({
      ...aiExperience,
      achievements: newAchievements.filter((a) => a.trim() !== ""),
    });
  };

  const addAchievement = () => {
    onAIExperienceChange({
      ...aiExperience,
      achievements: [...(aiExperience.achievements || []), ""],
    });
  };

  const handleAddOtherTool = () => {
    const trimmedTool = otherToolInput.trim();
    if (trimmedTool && !aiTools.includes(trimmedTool) && !POPULAR_AI_TOOLS.includes(trimmedTool as AITool)) {
      onAIToolsChange([...aiTools, trimmedTool]);
      setOtherToolInput("");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setShowSkillInfo(!showSkillInfo)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Info className="w-4 h-4" />
          スキルについて
        </button>
      </div>

      {showSkillInfo && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
          <div className="space-y-2">
            {Object.entries(AI_SKILLS).map(([key, skill]) => (
              <div key={key} className="flex items-start gap-2">
                <span className={`font-semibold ${
                  key === 'expert' ? 'text-purple-600' :
                  key === 'developer' ? 'text-blue-600' :
                  key === 'user' ? 'text-green-600' :
                  key === 'supporter' ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  {skill.label}:
                </span>
                <span className="text-gray-700">{skill.description}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-600">
            ※ 開発実績やGitHubリンクなどは、下部の「AI活用事例」セクションに登録できます
          </p>
        </div>
      )}

      <div className="space-y-6">
        {/* AI人材スキル選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI人材スキル（複数選択可）
          </label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(AI_SKILLS).map(([key, skill]) => (
              <button
                key={key}
                type="button"
                onClick={() => handleSkillToggle(key as AISkillType)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  aiSkills.includes(key as AISkillType)
                    ? 'border-blue-500 bg-blue-50'
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold mb-1">{skill.label}</div>
                <div className="text-xs text-gray-600">{skill.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* AIツール経験 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            使用経験のあるAIツール
          </label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_AI_TOOLS.map((tool) => (
              <button
                key={tool}
                type="button"
                onClick={() => handleToolToggle(tool)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  aiTools.includes(tool)
                    ? "bg-blue-500 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {tool}
              </button>
            ))}
          </div>
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-2">その他のツール</p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="ツール名を入力"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm"
                value={otherToolInput}
                onChange={(e) => setOtherToolInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddOtherTool();
                  }
                }}
              />
              <button
                type="button"
                onClick={handleAddOtherTool}
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
              >
                追加
              </button>
            </div>
            {/* 追加されたその他のツール表示 */}
            {aiTools.filter(tool => !POPULAR_AI_TOOLS.includes(tool as AITool)).length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {aiTools
                  .filter(tool => !POPULAR_AI_TOOLS.includes(tool as AITool))
                  .map((tool, index) => (
                    <span
                      key={`other-${index}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-gray-200 text-gray-700 rounded-full text-sm"
                    >
                      {tool}
                      <button
                        type="button"
                        onClick={() => onAIToolsChange(aiTools.filter(t => t !== tool))}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>

        {/* AI活用経験 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI活用経験
          </label>
          
          {/* 経験年数 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-600 mb-1">経験年数</label>
            <select
              value={aiExperience.years || 0}
              onChange={(e) =>
                onAIExperienceChange({
                  ...aiExperience,
                  years: parseInt(e.target.value),
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value={0}>1年未満</option>
              <option value={1}>1年</option>
              <option value={2}>2年</option>
              <option value={3}>3年</option>
              <option value={4}>4年</option>
              <option value={5}>5年以上</option>
            </select>
          </div>

          {/* 活用領域 */}
          <div className="mb-4">
            <label className="block text-xs text-gray-600 mb-1">活用領域</label>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_DOMAINS.map((domain) => (
                <button
                  key={domain}
                  type="button"
                  onClick={() => handleDomainToggle(domain)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    aiExperience.domains?.includes(domain)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ポートフォリオURL */}
        <div>
          <label htmlFor="portfolio" className="block text-sm font-medium text-gray-700 mb-1">
            ポートフォリオURL
          </label>
          <input
            id="portfolio"
            type="url"
            value={portfolioUrl}
            onChange={(e) => onPortfolioUrlChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="https://example.com"
          />
        </div>

        {/* AI活用実績 */}
        <div>
          <label htmlFor="achievements" className="block text-sm font-medium text-gray-700 mb-1">
            AI活用実績
          </label>
          <textarea
            id="achievements"
            value={aiAchievements}
            onChange={(e) => onAIAchievementsChange(e.target.value)}
            rows={6}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            placeholder="AIを活用した具体的な実績や成果を記載してください。&#10;例：&#10;・ChatGPTを活用した営業メール作成により、返信率を30%向上&#10;・社内の問い合わせ対応をAIチャットボットで自動化し、対応時間を80%削減&#10;・画像生成AIを使用したマーケティング素材作成で、制作コストを50%削減"
          />
          <p className="mt-1 text-xs text-gray-500">
            具体的な数値や成果を含めると、より説得力のあるプロフィールになります
          </p>
        </div>
      </div>
    </div>
  );
}