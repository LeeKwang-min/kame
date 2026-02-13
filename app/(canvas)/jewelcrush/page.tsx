'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import JewelCrush from './_components/JewelCrush';

const controls = [
  { key: '←→↑↓', action: '커서 이동 / 스왑' },
  { key: 'Space', action: '보석 선택' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
];

function JewelCrushPage() {
  const { data: scores = [], isLoading } = useGetScores('jewelcrush');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[630px]">
        <JewelCrush />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default JewelCrushPage;
