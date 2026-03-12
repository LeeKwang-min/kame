'use client';

import dynamic from 'next/dynamic';
import { Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import UserProfile from '@/components/auth/UserProfile';
import { useGetScores } from '@/service/scores';
import { SidebarAd } from '@/components/ads';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

const SuikaGame = dynamic(() => import('./_components/suikagame'), {
  ssr: false,
});

const controls = [
  { key: '< >', action: '집게 이동' },
  { key: 'SPACE / Click', action: '과일 드롭' },
  { key: 'R', action: '재시작' },
];

function SuikaGamePage() {
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('suikagame');

  return (
    <section className="w-full h-full flex flex-col xl:flex-row gap-4 xl:gap-6 items-center xl:items-start justify-center">
      {/* 모바일/태블릿: 햄버거 메뉴 (xl 미만에서만 표시) */}
      <div className="xl:hidden w-full flex justify-end px-2">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg border border-arcade-border bg-arcade-surface text-arcade-text">
              <Menu size={20} />
            </button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className="bg-arcade-bg border-arcade-border overflow-y-auto"
          >
            <SheetHeader>
              <SheetTitle className="text-arcade-text">Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-6 p-4">
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">
                  Player
                </h3>
                {status === 'loading' ? (
                  <div className="h-9 bg-arcade-border rounded animate-pulse" />
                ) : session?.user ? (
                  <UserProfile user={session.user} />
                ) : (
                  <GoogleLoginButton />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">
                  Controls
                </h3>
                <ControlInfoTable controls={controls} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">
                  Ranking
                </h3>
                <RankBoard data={scores} isLoading={isLoading} showCountry />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 데스크탑: 조작법 (xl 이상에서만 표시) */}
      <aside className="hidden xl:block shrink-0 w-72 space-y-4">
        <ControlInfoTable controls={controls} />
        <SidebarAd slot="sidebar-left" />
      </aside>

      {/* 게임 (항상 표시) */}
      <div className="w-full xl:flex-1 max-w-[480px]">
        <SuikaGame />
      </div>

      {/* 데스크탑: 랭킹 (xl 이상에서만 표시) */}
      <aside className="hidden xl:block shrink-0 w-64 space-y-4">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
        <SidebarAd slot="sidebar-right" />
      </aside>

    </section>
  );
}

export default SuikaGamePage;
