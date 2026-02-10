'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import BubbleShooter from './_components/BubbleShooter';

const controls = [
  { key: 'Mouse', action: '조준 / 발사' },
  { key: 'Space', action: '발사' },
  { key: '← →', action: '조준 조절' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
];

function BubbleShooterPage() {
  const { data: scores = [], isLoading } = useGetScores('bubbleshooter');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[480px]">
        <BubbleShooter />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default BubbleShooterPage;
