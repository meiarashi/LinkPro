"use client";

import { AI_SKILLS } from "../../types/ai-talent";

interface AIProfileDisplayProps {
  profileDetails: any;
}

export default function AIProfileDisplay({ profileDetails }: AIProfileDisplayProps) {
  const aiSkills = profileDetails?.ai_skills || [];
  const aiTools = profileDetails?.ai_tools || [];
  const aiExperience = profileDetails?.ai_experience || {};

  // AI関連の情報がない場合は表示しない
  if (aiSkills.length === 0 && aiTools.length === 0 && (!aiExperience.domains || aiExperience.domains.length === 0)) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">AI人材情報</h2>
      
      {/* AI人材スキル */}
      {aiSkills.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">AI人材スキル</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {aiSkills.map((skillKey) => {
              const skill = AI_SKILLS[skillKey];
              if (!skill) return null;
              
              return (
                <div
                  key={skillKey}
                  className="p-3 rounded-lg border-2 border-blue-500 bg-blue-50"
                >
                  <div className="font-semibold mb-1">{skill.label}</div>
                  <div className="text-sm text-gray-600">{skill.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 使用経験のあるAIツール */}
      {aiTools.length > 0 && (
        <div>
          <h3 className="font-semibold mb-3">使用経験のあるAIツール</h3>
          <div className="flex flex-wrap gap-2">
            {aiTools.map((tool, index) => (
              <span
                key={index}
                className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-sm"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* AI活用経験 */}
      {(aiExperience.years || (aiExperience.domains && aiExperience.domains.length > 0)) && (
        <div>
          <h3 className="font-semibold mb-3">AI活用経験</h3>
          
          {/* 経験年数 */}
          {aiExperience.years !== undefined && (
            <div className="mb-3">
              <span className="text-sm text-gray-600">経験年数: </span>
              <span className="font-medium">
                {aiExperience.years === 0 ? "1年未満" : 
                 aiExperience.years >= 5 ? "5年以上" : 
                 `${aiExperience.years}年`}
              </span>
            </div>
          )}

          {/* 活用領域 */}
          {aiExperience.domains && aiExperience.domains.length > 0 && (
            <div>
              <p className="text-sm text-gray-600 mb-2">活用領域：</p>
              <div className="flex flex-wrap gap-2">
                {aiExperience.domains.map((domain, index) => (
                  <span
                    key={index}
                    className="px-3 py-1.5 bg-blue-500 text-white rounded-full text-sm"
                  >
                    {domain}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ポートフォリオURL */}
      {profileDetails?.portfolio_url && (
        <div>
          <h3 className="font-semibold mb-2">ポートフォリオ</h3>
          <a 
            href={profileDetails.portfolio_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline"
          >
            {profileDetails.portfolio_url}
          </a>
        </div>
      )}
    </div>
  );
}