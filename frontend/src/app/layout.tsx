import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import AuthGuard from "@/components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "QuantFlow Real Estate OS — Autonomous AI Land & Property Acquisition",
  description: "An autonomous AI real estate intelligence and acquisition system capable of sourcing, analyzing, and pursuing profitable land and property opportunities using open-source intelligence, AI agents, and automated outreach.",
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthGuard>
          <ClientLayout>{children}</ClientLayout>
        </AuthGuard>
      </body>
    </html>
  );
}
