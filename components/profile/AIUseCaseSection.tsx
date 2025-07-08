"use client";

import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, ExternalLink } from "lucide-react";
import { AIUseCase } from "../../types/ai-talent";
import { createClient } from "../../utils/supabase/client";
import AIUseCaseModal from "./AIUseCaseModal";

interface AIUseCaseSectionProps {
  userId: string;
}

export default function AIUseCaseSection({ userId }: AIUseCaseSectionProps) {
  const supabase = createClient();
  const [useCases, setUseCases] = useState<AIUseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUseCase, setEditingUseCase] = useState<AIUseCase | undefined>();

  useEffect(() => {
    loadUseCases();
  }, [userId]);

  const loadUseCases = async () => {
    try {
      const { data, error } = await supabase
        .from("ai_use_cases")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUseCases(data || []);
    } catch (error) {
      console.error("Error loading use cases:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (useCase: AIUseCase) => {
    setEditingUseCase(useCase);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("この事例を削除してもよろしいですか？")) return;

    try {
      const { error } = await supabase
        .from("ai_use_cases")
        .delete()
        .eq("id", id);

      if (error) throw error;
      loadUseCases();
    } catch (error) {
      console.error("Error deleting use case:", error);
      alert("削除に失敗しました");
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingUseCase(undefined);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">AI活用事例</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
        >
          <Plus className="w-4 h-4" />
          事例を追加
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-500">読み込み中...</div>
      ) : useCases.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 mb-4">
            AI活用事例を追加して、あなたの実績をアピールしましょう
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-blue-600 hover:text-blue-800"
          >
            最初の事例を追加
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {useCases.map((useCase) => (
            <div
              key={useCase.id}
              className="border rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold mb-1">{useCase.title}</h3>
                  {useCase.description && (
                    <p className="text-sm text-gray-600 mb-2">
                      {useCase.description}
                    </p>
                  )}
                  
                  {/* 使用ツール */}
                  {useCase.tools_used.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {useCase.tools_used.map((tool, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs"
                        >
                          {tool}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* 成果指標 */}
                  {Object.keys(useCase.metrics).length > 0 && (
                    <div className="flex flex-wrap gap-3 mb-2">
                      {Object.entries(useCase.metrics).map(([key, value]) => {
                        if (!value) return null;
                        const label = {
                          efficiency_improvement: "効率改善",
                          cost_reduction: "コスト削減",
                          quality_improvement: "品質向上",
                          time_saved: "時間削減",
                        }[key] || key;
                        return (
                          <span
                            key={key}
                            className="text-sm text-green-600 font-medium"
                          >
                            {label}: {value}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* タグ */}
                  {useCase.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {useCase.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* アクション */}
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(useCase)}
                    className="p-2 text-gray-600 hover:text-blue-600"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(useCase.id)}
                    className="p-2 text-gray-600 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 公開状態 */}
              <div className="flex items-center gap-2 mt-2 text-xs">
                {useCase.is_public ? (
                  <span className="text-green-600">公開中</span>
                ) : (
                  <span className="text-gray-500">非公開</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* モーダル */}
      <AIUseCaseModal
        isOpen={showModal}
        onClose={handleModalClose}
        useCase={editingUseCase}
        onSave={loadUseCases}
      />
    </div>
  );
}