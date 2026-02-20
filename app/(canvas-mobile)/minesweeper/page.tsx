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
import Minesweeper from './_components/Minesweeper';

const controls = [
  { key: 'Click', action: '셀 열기' },
  { key: 'Right Click', action: '깃발 토글' },
  { key: 'Click (숫자)', action: '주변 일괄 열기' },
  { key: 'Tap', action: '셀 열기 (모바일)' },
  { key: 'Long Press', action: '깃발 토글 (모바일)' },
  { key: 'Pinch', action: '확대/축소 (모바일)' },
  { key: 'Drag (확대시)', action: '이동 (모바일)' },
  { key: 'S / Tap card', action: '시작' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
];

function MinesweeperPage() {
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('minesweeper');

  return (
    <section className="w-full h-full flex flex-col xl:flex-row gap-4 xl:gap-6 items-center xl:items-start justify-center">
      {/* 모바일/태블릿: 햄버거 메뉴 */}
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

      {/* 데스크탑: 조작법 */}
      <aside className="hidden xl:block shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>

      {/* 게임 캔버스 */}
      <div className="w-full flex-1 min-h-0 xl:flex-initial max-w-[800px]">
        <Minesweeper />
      </div>

      {/* 데스크탑: 랭킹 */}
      <aside className="hidden xl:block shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default MinesweeperPage;
