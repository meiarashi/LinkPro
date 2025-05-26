"use client";

export const dynamic = 'force-dynamic';

import React, { Suspense } from "react";
import SSOCallbackClientContent from "./SSOCallbackClientContent";
import { Loader2 } from "lucide-react"; // Fallbackで使用

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h2 className="text-2xl font-semibold">読み込み中...</h2>
        </div>
      </div>
    }>
      <SSOCallbackClientContent />
    </Suspense>
  );
} 