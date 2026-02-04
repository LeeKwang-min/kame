'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import G2048 from './_components/G2048';

const controls = [
  { key: '← → ↑ ↓', action: '블럭 이동' },
  { key: 'P', action: '일시정지' },
  { key: 'S', action: '재개' },
  { key: 'R', action: '재시작' },
];

function G2048Page() {
  const { data: scores = [], isLoading } = useGetScores('2048');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-64">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-[480px] max-w-[480px]">
        <G2048 />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default G2048Page;
