'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Stairs from './_components/Stairs';

const controls = [
  { key: '← →', action: '이동 방향 선택' },
  { key: 'Click/Touch', action: '화면 좌우 터치로 이동' },
  { key: 'S', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
];

function StairsPage() {
  const { data: scores = [], isLoading } = useGetScores('stairs');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-64">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-[600px] max-w-[400px]">
        <Stairs />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default StairsPage;
