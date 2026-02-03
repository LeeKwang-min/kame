'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import SpaceInvaders from './_components/SpaceInvaders';

const controls = [
  { key: '←/→', action: '좌우 이동' },
  { key: 'Space', action: '발사' },
  { key: 'S', action: '게임 시작' },
  { key: 'R', action: '재시작' },
];

function SpaceInvadersPage() {
  const { data: scores = [], isLoading } = useGetScores('spaceinvaders');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-64">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[480px]">
        <SpaceInvaders />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default SpaceInvadersPage;
