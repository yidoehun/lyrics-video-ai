import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LyricsVideo AI",
  description: "AI 자동 가사 영상 생성기",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
