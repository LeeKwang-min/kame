'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Tetris from './_components/Tetris';

const controls = [
  { key: '← →', action: '좌우 이동' },
  { key: '↓', action: '소프트 드롭' },
  { key: 'Space', action: '하드 드롭' },
  { key: '↑ / X', action: '시계 방향 회전' },
  { key: 'Z', action: '반시계 방향 회전' },
  { key: 'C', action: '홀드' },
  { key: 'S', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
];

function TetrisPage() {
  const { data: scores = [], isLoading } = useGetScores('tetris');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-64">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[420px]">
        <Tetris />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default TetrisPage;
