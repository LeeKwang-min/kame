'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Kero33 from './_components/Kero33';

const controls = [
  { key: '↑ ↓ ← →', action: '이동' },
  { key: 'S', action: '시작' },
  { key: 'Space', action: '대시' },
];

function Kero33Page() {
  const { data: scores = [], isLoading } = useGetScores('kero33');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-64">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[600px]">
        <Kero33 />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default Kero33Page;
