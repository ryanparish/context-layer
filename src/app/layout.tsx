import type { Metadata } from "next";
import "./globals.css";
import PublicNav from "@/components/marketing/PublicNav";

export const metadata: Metadata = {
  title: "xAPIvate",
  description: "Centralized xAPI + automations + dashboards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-950">
        <PublicNav />
        {children}
      </body>
    </html>
  );
}
