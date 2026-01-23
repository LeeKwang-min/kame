import KameHeader from '@/components/common/KameHeader';
import { Metadata } from 'next';

// export const metadata: Metadata = {
//   title: "Dodge",
//   description:
//     "Dodge는 웹 게임 모음 사이트입니다.",
//   keywords: [
//     "Dodge",
//     "웹 게임 모음",
//     "웹 게임",
//     "게임",
//     "게임 모음",
//     "게임 사이트",
//     "게임 사이트 모음",
//   ],
//   openGraph: {
//     type: "website",
//     title: "Lorem Ipsum Generator | Kools",
//     description:
//       "디자인과 개발에 바로 사용할 수 있는 로렘 입숨 더미 텍스트를 손쉽게 생성하세요.",
//     url: "https://kools.vercel.app/lorem-ipsum-generator",
//     siteName: "Kools",
//     images: [
//       {
//         url: "/image/logo.png",
//         width: 1200,
//         height: 630,
//         alt: "Kools",
//       },
//     ],
//   },
//   robots: {
//     index: true,
//     follow: true,
//     googleBot: {
//       index: true,
//       follow: true,
//       "max-image-preview": "large",
//     },
//   },
// };

function MissileCommandLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Missile Command" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default MissileCommandLayout;
