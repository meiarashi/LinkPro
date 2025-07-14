"use client";

import { useState, useEffect } from "react";
import { ExternalLink, BarChart2, Clock, Target, TrendingUp } from "lucide-react";
import { AIUseCase } from "../../types/ai-talent";
import { createClient } from "../../utils/supabase/client";

interface AIUseCaseDisplayProps {
  userId: string;
}

export default function AIUseCaseDisplay({ userId }: AIUseCaseDisplayProps) {
  const supabase = createClient();
  const [useCases, setUseCases] = useState<AIUseCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUseCases();
  }, [userId]);

  const loadUseCases = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_use_cases")
        .select("*")
        .eq("user_id", userId)
        .eq("is_public", true) // 公開されている事例のみ表示
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUseCases(data || []);
    } catch (error) {
      console.error("Error loading use cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case "efficiency_improvement":
        return <TrendingUp className="w-4 h-4" />;
      case "cost_reduction":
        return <BarChart2 className="w-4 h-4" />;
      case "quality_improvement":
        return <Target className="w-4 h-4" />;
      case "time_saved":
        return <Clock className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case "efficiency_improvement":
        return "効率改善";
      case "cost_reduction":
        return "コスト削減";
      case "quality_improvement":
        return "品質向上";
      case "time_saved":
        return "時間短縮";
      default:
        return metric;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8 text-gray-500">読み込み中...</div>
    );
  }

  if (useCases.length === 0) {
    return null; // 公開されている事例がない場合は表示しない
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">AI活用事例</h2>
      
      <div className="space-y-4">
        {useCases.map((useCase) => (
          <div
            key={useCase.id}
            className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-lg mb-2">{useCase.title}</h3>
            
            {useCase.description && (
              <p className="text-gray-600 mb-3 whitespace-pre-wrap">
                {useCase.description}
              </p>
            )}

            {/* 使用ツール */}
            {useCase.tools_used && useCase.tools_used.length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">使用ツール：</p>
                <div className="flex flex-wrap gap-2">
                  {useCase.tools_used.map((tool, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ビジネスインパクト */}
            {useCase.business_impact && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">ビジネスインパクト：</p>
                <p className="text-gray-600 text-sm">{useCase.business_impact}</p>
              </div>
            )}

            {/* 成果指標 */}
            {useCase.metrics && Object.keys(useCase.metrics).length > 0 && (
              <div className="mb-3">
                <p className="text-sm font-medium text-gray-700 mb-1">成果指標：</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(useCase.metrics).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 text-sm">
                      {getMetricIcon(key)}
                      <span className="text-gray-600">
                        {getMetricLabel(key)}: {value}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* リンク */}
            {useCase.attachments && useCase.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {useCase.attachments
                  .filter((attachment) => attachment.type === 'link')
                  .map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {link.name || "リンク"}
                    </a>
                  ))}
              </div>
            )}

            {/* タグ */}
            {useCase.tags && useCase.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {useCase.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}