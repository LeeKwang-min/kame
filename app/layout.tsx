import type { Metadata } from "next";
import { Noto_Sans, Space_Mono } from "next/font/google";
import "./globals.css";
import ScreenReaderInfo from "@/components/common/ScreenReaderInfo";
import TanstackQueryProvider from "@/provider/TanstackQueryProvider";
import { Toaster } from "sonner";

const mono = Space_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "700"],
});

const notoSans = Noto_Sans({
  variable: "--font-noto-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://kame.vercel.app"),
  title: {
    default: "Kame",
    template: "%s | Kame",
  },
  description: "여러가지 웹 게임 모음 사이트",
  keywords: [
    "Kame",
    "웹 게임 모음",
    "웹 게임",
    "게임",
    "게임 모음",
    "게임 사이트",
    "게임 사이트 모음",
  ],
  // openGraph: {
  //   type: "website",
  //   title: "Kame",
  //   description:
  //     "Kools is a collection of tools for developers and designers. made by Kwangmin",
  //   url: "https://kame.vercel.app",
  //   siteName: "Kame",
  //   images: [
  //     {
  //       url: "/image/logo.png",
  //       width: 1200,
  //       height: 630,
  //       alt: "Kools",
  //     },
  //   ],
  // },
  // robots: {
  //   index: true,
  //   follow: true,
  //   googleBot: {
  //     index: true,
  //     follow: true,
  //     "max-image-preview": "large",
  //   },
  // },
  // verification: {
  //   google: "",
  // },
  // other: {
  //   "naver-site-verification": "",
  // },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${notoSans.className} ${notoSans.variable} ${mono.className} ${mono.variable} antialiased`}
      >
        <ScreenReaderInfo />
        <TanstackQueryProvider>{children}</TanstackQueryProvider>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
