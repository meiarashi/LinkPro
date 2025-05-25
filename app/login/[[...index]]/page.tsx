"use client";

import { SignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useState, useEffect } from "react";

export default function LoginPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="flex justify-center">
          <h1 className="text-2xl font-bold text-primary">LinkPro</h1>
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          アカウントにログイン
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          まだアカウントをお持ちでない方は{" "}
          <Link href="/signup" className="font-medium text-primary hover:text-primary/90">
            こちらから登録
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {mounted && (
            <SignIn 
              path="/login"
              routing="path"
              signUpUrl="/signup"
              redirectUrl="/dashboard"
              afterSignInUrl="/dashboard"
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