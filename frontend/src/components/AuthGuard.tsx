"use client";

import React from "react";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  // Pass-through bypass for local desktop single-user setup
  return <>{children}</>;
}
