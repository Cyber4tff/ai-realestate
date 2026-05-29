"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Automatically redirect users to the dashboard home page
    router.replace("/");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#07070c] flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
}
