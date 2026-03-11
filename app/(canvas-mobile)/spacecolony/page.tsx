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
import SpaceColony from './_components/spacecolony';
import { AnchorAd, SidebarAd } from '@/components/ads';

const controls = [
  { key: 'S / Tap', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
  { key: '1~8', action: '건물 건설/업그레이드' },
  { key: 'T', action: '탭 전환 (건설/연구/정보)' },
];

function SpaceColonyPage() {
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('spacecolony');

  return (
    <section className="w-full h-full flex flex-col xl:flex-row gap-4 xl:gap-6 items-center xl:items-start justify-center">
      {/* Mobile/Tablet: hamburger menu (below xl only) */}
      <div className="xl:hidden w-full flex justify-end px-2">
        <Sheet>
          <SheetTrigger asChild>
            <button className="p-2 rounded-lg border border-arcade-border bg-arcade-surface text-arcade-text">
              <Menu size={20} />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="bg-arcade-bg border-arcade-border overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="text-arcade-text">Menu</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-6 p-4">
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">Player</h3>
                {status === 'loading' ? (
                  <div className="h-9 bg-arcade-border rounded animate-pulse" />
                ) : session?.user ? (
                  <UserProfile user={session.user} />
                ) : (
                  <GoogleLoginButton />
                )}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">Controls</h3>
                <ControlInfoTable controls={controls} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">Ranking</h3>
                <RankBoard data={scores} isLoading={isLoading} showCountry />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: controls (xl+ only) */}
      <aside className="hidden xl:block shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>

      {/* Game canvas (always shown) */}
      <div className="w-full xl:flex-1 max-w-[620px]">
        <SpaceColony />
      </div>

      {/* Desktop: ranking (xl+ only) */}
      <aside className="hidden xl:block shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default SpaceColonyPage;
