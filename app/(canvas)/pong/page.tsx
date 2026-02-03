'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Pong from './_components/Pong';

const controls = [
  { key: 'W / S', action: 'P1 패들 이동' },
  { key: '↑ / ↓', action: 'P2 패들 이동 (멀티)' },
  { key: 'Space', action: '게임 시작' },
  { key: 'R', action: '재시작' },
  { key: 'ESC', action: '메뉴로' },
];

function PongPage() {
  const { data: scores = [], isLoading } = useGetScores('pong');

  return (
    <section className="w-full h-full flex gap-6 items-start">
      <aside className="shrink-0 w-64 space-y-4">
        <ControlInfoTable controls={controls} />
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
      <div className="flex-1 h-full">
        <Pong />
      </div>
    </section>
  );
}

export default PongPage;
