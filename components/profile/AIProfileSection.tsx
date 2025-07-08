"use client";

import { useState } from "react";
import { AILevel, AITool, AI_LEVELS, SKILL_CATEGORIES } from "../../types/ai-talent";
import { ChevronDown, Info } from "lucide-react";

interface AIProfileSectionProps {
  aiLevel: AILevel | undefined;
  aiTools: string[];
  aiExperience: {
    years: number;
    domains: string[];
    achievements: string[];
  };
  onAILevelChange: (level: AILevel) => void;
  onAIToolsChange: (tools: string[]) => void;
  onAIExperienceChange: (experience: any) => void;
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
  aiLevel,
  aiTools,
  aiExperience,
  onAILevelChange,
  onAIToolsChange,
  onAIExperienceChange,
}: AIProfileSectionProps) {
  const [showLevelInfo, setShowLevelInfo] = useState(false);

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

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">AI人材情報</h2>
        <button
          type="button"
          onClick={() => setShowLevelInfo(!showLevelInfo)}
          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          <Info className="w-4 h-4" />
          レベルについて
        </button>
      </div>

      {showLevelInfo && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg text-sm">
          <div className="space-y-2">
            {Object.entries(AI_LEVELS).map(([key, level]) => (
              <div key={key} className="flex items-start gap-2">
                <span className={`font-semibold ${
                  key === 'expert' ? 'text-purple-600' :
                  key === 'developer' ? 'text-blue-600' :
                  key === 'user' ? 'text-green-600' :
                  key === 'supporter' ? 'text-orange-600' :
                  'text-gray-600'
                }`}>
                  {level.label}:
                </span>
                <span className="text-gray-700">{level.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* AI人材レベル選択 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI人材レベル <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(AI_LEVELS).map(([key, level]) => (
              <button
                key={key}
                type="button"
                onClick={() => onAILevelChange(key as AILevel)}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  aiLevel === key
                    ? key === 'expert' ? 'border-purple-500 bg-purple-50' :
                      key === 'developer' ? 'border-blue-500 bg-blue-50' :
                      key === 'user' ? 'border-green-500 bg-green-50' :
                      key === 'supporter' ? 'border-orange-500 bg-orange-50' :
                      'border-gray-500 bg-gray-50'
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold mb-1">{level.label}</div>
                <div className="text-xs text-gray-600">{level.description}</div>
                <div className="text-xs text-gray-500 mt-1">
                  目安: {level.minRate.toLocaleString()}円/時〜
                </div>
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
          <input
            type="text"
            placeholder="その他のツール（カンマ区切り）"
            className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
            onBlur={(e) => {
              const otherTools = e.target.value
                .split(",")
                .map((t) => t.trim())
                .filter((t) => t && !POPULAR_AI_TOOLS.includes(t as AITool));
              if (otherTools.length > 0) {
                onAIToolsChange([...aiTools, ...otherTools]);
                e.target.value = "";
              }
            }}
          />
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
                      ? "bg-green-500 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {domain}
                </button>
              ))}
            </div>
          </div>

          {/* 実績・成果 */}
          <div>
            <label className="block text-xs text-gray-600 mb-1">
              実績・成果（具体的な数値があれば記載）
            </label>
            {(aiExperience.achievements || []).map((achievement, index) => (
              <input
                key={index}
                type="text"
                value={achievement}
                onChange={(e) => handleAchievementChange(index, e.target.value)}
                placeholder="例: 業務効率を30%改善"
                className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            ))}
            <button
              type="button"
              onClick={addAchievement}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              + 実績を追加
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}