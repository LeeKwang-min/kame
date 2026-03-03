'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import PuyoPuyo from './_components/PuyoPuyo';

const controls = [
  { key: '←→', action: '좌우 이동' },
  { key: '↑ / Z', action: '회전' },
  { key: '↓', action: '소프트 드롭' },
  { key: 'Space', action: '하드 드롭' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
];

function PuyoPuyoPage() {
  const { data: scores = [], isLoading } = useGetScores('puyopuyo');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[450px]">
        <PuyoPuyo />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default PuyoPuyoPage;
