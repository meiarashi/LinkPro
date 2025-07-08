"use client";

import { useState } from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { AIUseCase } from "../../types/ai-talent";
import { createClient } from "../../utils/supabase/client";

interface AIUseCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  useCase?: AIUseCase;
  onSave: () => void;
}

const METRIC_TYPES = [
  { key: "efficiency_improvement", label: "効率改善" },
  { key: "cost_reduction", label: "コスト削減" },
  { key: "quality_improvement", label: "品質向上" },
  { key: "time_saved", label: "時間削減" },
];

export default function AIUseCaseModal({
  isOpen,
  onClose,
  useCase,
  onSave,
}: AIUseCaseModalProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  
  // フォームデータ
  const [formData, setFormData] = useState({
    title: useCase?.title || "",
    description: useCase?.description || "",
    tools_used: useCase?.tools_used || [],
    business_impact: useCase?.business_impact || "",
    metrics: useCase?.metrics || {},
    tags: useCase?.tags || [],
    is_public: useCase?.is_public !== false,
  });

  const [newTool, setNewTool] = useState("");
  const [newTag, setNewTag] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not found");

      if (useCase?.id) {
        // 更新
        const { error } = await supabase
          .from("ai_use_cases")
          .update({
            ...formData,
            updated_at: new Date().toISOString(),
          })
          .eq("id", useCase.id);

        if (error) throw error;
      } else {
        // 新規作成
        const { error } = await supabase
          .from("ai_use_cases")
          .insert({
            ...formData,
            user_id: user.id,
          });

        if (error) throw error;
      }

      onSave();
      onClose();
    } catch (error) {
      console.error("Error saving use case:", error);
      alert("保存に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const addTool = () => {
    if (newTool.trim()) {
      setFormData({
        ...formData,
        tools_used: [...formData.tools_used, newTool.trim()],
      });
      setNewTool("");
    }
  };

  const removeTool = (index: number) => {
    setFormData({
      ...formData,
      tools_used: formData.tools_used.filter((_, i) => i !== index),
    });
  };

  const addTag = () => {
    if (newTag.trim()) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag.trim()],
      });
      setNewTag("");
    }
  };

  const removeTag = (index: number) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((_, i) => i !== index),
    });
  };

  const updateMetric = (key: string, value: string) => {
    setFormData({
      ...formData,
      metrics: {
        ...formData.metrics,
        [key]: value,
      },
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {useCase ? "AI活用事例を編集" : "AI活用事例を追加"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="例: ChatGPTを活用した営業メール作成の効率化"
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              詳細説明
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="具体的な活用方法や工夫した点を記載してください"
            />
          </div>

          {/* 使用したAIツール */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              使用したAIツール
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTool}
                  onChange={(e) => setNewTool(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTool())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="ツール名を入力"
                />
                <button
                  type="button"
                  onClick={addTool}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tools_used.map((tool, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
                  >
                    {tool}
                    <button
                      type="button"
                      onClick={() => removeTool(index)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ビジネスへの影響 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ビジネスへの影響
            </label>
            <textarea
              value={formData.business_impact}
              onChange={(e) =>
                setFormData({ ...formData, business_impact: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
              placeholder="どのような価値を生み出したか、どんな課題を解決したか"
            />
          </div>

          {/* 成果指標 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              成果指標
            </label>
            <div className="space-y-2">
              {METRIC_TYPES.map((metric) => (
                <div key={metric.key} className="flex items-center gap-2">
                  <label className="w-24 text-sm text-gray-600">
                    {metric.label}
                  </label>
                  <input
                    type="text"
                    value={formData.metrics[metric.key] || ""}
                    onChange={(e) => updateMetric(metric.key, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    placeholder="例: 30%削減"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* タグ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タグ
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="タグを入力"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  追加
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(index)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* 公開設定 */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_public"
              checked={formData.is_public}
              onChange={(e) =>
                setFormData({ ...formData, is_public: e.target.checked })
              }
              className="w-4 h-4 text-blue-600 rounded"
            />
            <label htmlFor="is_public" className="text-sm text-gray-700">
              この事例を公開する（他のユーザーに表示されます）
            </label>
          </div>

          {/* ボタン */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "保存中..." : "保存"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}