import type { Metadata } from "next";
import "./globals.css";

// ⚠️ 핵심: 검색 엔진이 이 사이트를 긁어가지 못하게 막는 설정
export const metadata: Metadata = {
  title: "GreenKirin Webtoon Archive",
  description: "Internal Asset Library",
  robots: {
    index: false,  // "검색 결과에 올리지 마!"
    follow: false, // "이 안의 링크도 따라가지 마!"
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}