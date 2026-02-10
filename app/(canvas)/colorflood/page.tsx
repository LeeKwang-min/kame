'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import ColorFlood from './_components/ColorFlood';

const controls = [
  { key: 'Click', action: '색상 선택' },
  { key: '1-6', action: '색상 선택 (키보드)' },
  { key: 'Z', action: '되돌리기' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
];

function ColorFloodPage() {
  const { data: scores = [], isLoading } = useGetScores('colorflood');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[600px]">
        <ColorFlood />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default ColorFloodPage;
