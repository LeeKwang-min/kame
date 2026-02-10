'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Minesweeper from './_components/Minesweeper';

const controls = [
  { key: 'Click', action: '셀 열기' },
  { key: 'Right Click', action: '깃발 토글' },
  { key: 'Click (숫자)', action: '주변 일괄 열기' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
];

function MinesweeperPage() {
  const { data: scores = [], isLoading } = useGetScores('minesweeper');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[800px]">
        <Minesweeper />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default MinesweeperPage;
