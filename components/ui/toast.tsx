"use client";

import * as React from "react";
import { CheckCircle, XCircle, AlertCircle, X, Loader2 } from "lucide-react";

export interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "loading";
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const addToast = React.useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).substring(7);
    const newToast = { ...toast, id };
    setToasts((prev) => [...prev, newToast]);

    // 自動削除（loadingタイプ以外）
    if (toast.type !== "loading") {
      const duration = toast.duration || 5000;
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({
  toasts,
  removeToast,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
}) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: () => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-600" />,
    error: <XCircle className="w-5 h-5 text-red-600" />,
    warning: <AlertCircle className="w-5 h-5 text-orange-600" />,
    loading: <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />,
  };

  const backgrounds = {
    success: "bg-green-50 border-green-200",
    error: "bg-red-50 border-red-200",
    warning: "bg-orange-50 border-orange-200",
    loading: "bg-blue-50 border-blue-200",
  };

  const textColors = {
    success: "text-green-800",
    error: "text-red-800",
    warning: "text-orange-800",
    loading: "text-blue-800",
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-300 animate-slide-in-right ${
        backgrounds[toast.type]
      }`}
    >
      {icons[toast.type]}
      <p className={`text-sm font-medium ${textColors[toast.type]} flex-1`}>
        {toast.message}
      </p>
      {toast.type !== "loading" && (
        <button
          onClick={onRemove}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// グローバルトースト関数
let globalAddToast: ((toast: Omit<Toast, "id">) => void) | null = null;

export function setGlobalToast(addToast: (toast: Omit<Toast, "id">) => void) {
  globalAddToast = addToast;
}

export const toast = {
  success: (message: string, duration?: number) => {
    globalAddToast?.({ type: "success", message, duration });
  },
  error: (message: string, duration?: number) => {
    globalAddToast?.({ type: "error", message, duration });
  },
  warning: (message: string, duration?: number) => {
    globalAddToast?.({ type: "warning", message, duration });
  },
  loading: (message: string) => {
    globalAddToast?.({ type: "loading", message });
  },
};