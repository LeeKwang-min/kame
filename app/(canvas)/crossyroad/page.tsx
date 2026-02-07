'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import CrossyRoad from './_components/CrossyRoad';

const controls = [
  { key: '↑ ↓ ← →', action: '이동' },
  { key: 'WASD', action: '이동' },
  { key: 'S', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
];

function CrossyRoadPage() {
  const { data: scores = [], isLoading } = useGetScores('crossyroad');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-[700px] max-w-[624px]">
        <CrossyRoad />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default CrossyRoadPage;
