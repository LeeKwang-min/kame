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
import Tetris from './_components/Tetris';

const controls = [
  { key: '← →', action: '좌우 이동' },
  { key: '↓', action: '소프트 드롭' },
  { key: 'Space', action: '하드 드롭' },
  { key: '↑ / X', action: '시계 방향 회전' },
  { key: 'Z', action: '반시계 방향 회전' },
  { key: 'C', action: '홀드' },
  { key: 'S', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
];

const mobileControls = [
  { key: '탭', action: '시계 방향 회전' },
  { key: '좌우 드래그', action: '좌우 이동' },
  { key: '아래로 드래그', action: '소프트 드롭' },
  { key: '빠른 아래 스와이프', action: '하드 드롭' },
  { key: '위로 스와이프', action: '홀드' },
];

function TetrisPage() {
  const { data: session, status } = useSession();
  const { data: scores = [], isLoading } = useGetScores('tetris');

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
                  Touch Controls
                </h3>
                <ControlInfoTable controls={mobileControls} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-arcade-cyan mb-2">
                  Keyboard Controls
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
      <aside className="hidden xl:block shrink-0 w-64">
        <ControlInfoTable controls={controls} />
      </aside>

      {/* 게임 캔버스 (항상 표시) */}
      <div className="w-full xl:flex-1 max-w-[420px] h-full">
        <Tetris />
      </div>

      {/* 데스크탑: 랭킹 (xl 이상에서만 표시) */}
      <aside className="hidden xl:block shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default TetrisPage;
