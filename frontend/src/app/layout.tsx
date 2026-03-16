import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "manefo — 個人資産管理",
    template: "%s | manefo",
  },
  description:
    "無料・無制限・広告なし。Money Forward MEの完全上位互換を目指す個人資産管理アプリ。",
  keywords: ["資産管理", "家計簿", "投資", "個人資産", "manefo"],
  robots: "noindex, nofollow",  // 個人金融アプリはインデックス不要
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0F62FE" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#F9FAFB] dark:bg-[#111827] text-[#111827] dark:text-[#F9FAFB] font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
