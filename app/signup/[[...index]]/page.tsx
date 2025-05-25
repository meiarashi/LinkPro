"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function SignUpPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const [userType, setUserType] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (type && (type === "client" || type === "pm")) {
      setUserType(type);
      // ユーザータイプをローカルストレージに保存して、登録後も利用できるようにする
      if (typeof window !== 'undefined') {
        localStorage.setItem("userType", type);
      }
    }
  }, [type]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <h1 className="text-2xl font-bold text-primary">LinkPro</h1>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          {userType === "client" 
            ? "クライアントとして登録" 
            : userType === "pm" 
              ? "PMとして登録" 
              : "アカウント作成"}
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          すでにアカウントをお持ちの方は{" "}
          <Link href="/login" className="font-medium text-primary hover:text-primary/90">
            こちらからログイン
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {mounted && (
            <SignUp 
              path="/signup"
              routing="path"
              signInUrl="/login"
              redirectUrl={userType ? `/onboarding?type=${userType}` : "/onboarding"}
              afterSignUpUrl={userType ? `/onboarding?type=${userType}` : "/onboarding"}
              appearance={{
                elements: {
                  formButtonPrimary: "bg-primary hover:bg-primary/90 text-white",
                  card: "shadow-none",
                  formFieldInput: "border border-gray-300 rounded-md p-2",
                  footerActionLink: "text-primary hover:text-primary/90"
                },
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
} 