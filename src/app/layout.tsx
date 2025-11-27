import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SocialCopy AI",
  description: "将长文内容转换为各大社媒平台可用的高质量文案",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-900 text-slate-100">
        {children}
      </body>
    </html>
  );
}
