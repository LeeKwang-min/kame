import type { Metadata } from 'next';
import { Noto_Sans, Space_Mono } from 'next/font/google';
import './globals.css';
import ScreenReaderInfo from '@/components/common/ScreenReaderInfo';
import InitialsAlert from '@/components/common/InitialsAlert';
import TanstackQueryProvider from '@/provider/TanstackQueryProvider';
import AuthProvider from '@/provider/AuthProvider';
import { LocaleProvider } from '@/provider/LocaleProvider';
import { ThemeProvider } from '@/provider/ThemeProvider';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/next';

const mono = Space_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '700'],
});

const notoSans = Noto_Sans({
  variable: '--font-noto-sans',
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://kame.vercel.app'),
  title: {
    default: 'Kame - 무료 웹 게임 모음',
    template: '%s | Kame',
  },
  description:
    'Kame에서 테트리스, 스네이크, 플래피버드 등 30개 이상의 무료 웹 게임을 즐겨보세요. 회원가입 없이 PC와 모바일에서 바로 플레이할 수 있습니다.',
  keywords: [
    'Kame',
    '웹 게임',
    '무료 게임',
    '브라우저 게임',
    '온라인 게임',
    '아케이드 게임',
    '테트리스',
    '스네이크 게임',
    '플래피버드',
    '미니게임',
    '캐주얼 게임',
    'free web games',
    'browser games',
    'arcade games',
  ],
  openGraph: {
    type: 'website',
    title: 'Kame - 무료 웹 게임 모음',
    description: '30개 이상의 무료 웹 게임을 브라우저에서 즐겨보세요!',
    url: 'https://kame.vercel.app',
    siteName: 'Kame',
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Kame - 무료 웹 게임 모음',
    description: '30개 이상의 무료 웹 게임을 브라우저에서 즐겨보세요!',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  verification: {
    google: '', // Google Search Console 인증 코드
  },
  other: {
    'naver-site-verification': '', // 네이버 서치어드바이저 인증 코드
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${notoSans.className} ${notoSans.variable} ${mono.className} ${mono.variable} antialiased`}>
        <ScreenReaderInfo />
        <ThemeProvider>
          <AuthProvider>
            <LocaleProvider>
              <TanstackQueryProvider>{children}</TanstackQueryProvider>
              <InitialsAlert />
            </LocaleProvider>
          </AuthProvider>
        </ThemeProvider>
        <Toaster position="bottom-right" />
        <Analytics />
      </body>
    </html>
  );
}
