'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import HighLow from './_components/HighLow';

const controls = [
  { key: '←', action: 'HIGH 선택' },
  { key: '→', action: 'LOW 선택' },
  { key: 'Enter', action: '선택 확정' },
  { key: 'R', action: '재시작' },
];

function HighLowPage() {
  const { data: scores = [], isLoading } = useGetScores('highlow');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[620px]">
        <HighLow />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default HighLowPage;
