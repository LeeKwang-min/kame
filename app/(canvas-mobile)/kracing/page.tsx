'use client';

import { Menu } from 'lucide-react';
import { useSession } from 'next-auth/react';
import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import UserProfile from '@/components/auth/UserProfile';
import { useGetScores } from '@/service/scores';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import KRacing from './_components/KRacing';
import { SidebarAd } from '@/components/ads';

const controls = [
  { key: '← →', action: '좌/우 회전' },
  { key: 'Space', action: '브레이크' },
  { key: 'Space + ←→', action: '드리프트' },
  { key: 'S / Tap', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
];

function formatTimeScore(ms: number): string {
  const totalSec = ms / 1000;
  const min = Math.floor(totalSec / 60);
  const sec = Math.floor(totalSec % 60);
  const millis = Math.floor(ms % 1000);
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

function KRacingPage() {
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('kracing');

  return (
    <section className="relative w-full h-full flex flex-col xl:flex-row gap-4 xl:gap-6 items-center xl:items-start justify-center">
      {/* 모바일: 햄버거 메뉴 (절대 위치로 공간 차지 안 함) */}
      <div className="xl:hidden absolute top-0 right-0 z-10 px-2">
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
                <RankBoard data={scores} isLoading={isLoading} showCountry formatScore={formatTimeScore} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* 데스크탑: 조작법 */}
      <aside className="hidden xl:block shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>

      {/* 게임 캔버스 */}
      <div className="w-full flex-1 max-w-[800px]">
        <KRacing />
      </div>

      {/* 데스크탑: 랭킹 */}
      <aside className="hidden xl:block shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry formatScore={formatTimeScore} />
      </aside>
    </section>
  );
}

export default KRacingPage;
