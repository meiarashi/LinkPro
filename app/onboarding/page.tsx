"use client";

export const dynamic = 'force-dynamic';

import React, { Suspense } from "react";
import OnboardingClientContent from "./OnboardingClientContent";
import { LoadingPage } from "../../components/ui/loading";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <OnboardingClientContent />
    </Suspense>
  );
} 