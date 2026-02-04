'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Slot from './_components/Slot';

const controls = [
  { key: 'Space', action: '스핀' },
  { key: '← / →', action: '베팅 금액 변경' },
  { key: 'R', action: '재시작' },
];

function SlotPage() {
  const { data: scores = [], isLoading } = useGetScores('slot');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[620px]">
        <Slot />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default SlotPage;
