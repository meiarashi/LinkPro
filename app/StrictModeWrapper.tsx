"use client";

import { ReactNode } from 'react';

interface StrictModeWrapperProps {
  children: ReactNode;
}

// 開発環境でのみStrictModeを無効化（react-beautiful-dnd対応）
export default function StrictModeWrapper({ children }: StrictModeWrapperProps) {
  // react-beautiful-dndはStrictModeと互換性がないため、
  // この問題が解決されるまでStrictModeを無効化
  return <>{children}</>;
}