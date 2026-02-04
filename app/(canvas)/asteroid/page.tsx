'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Asteroid from './_components/Asteroid';

const controls = [
  { key: '← →', action: '회전' },
  { key: '↑', action: '가속' },
  { key: 'Space', action: '발사' },
  { key: 'S', action: '게임 시작 / 재개' },
  { key: 'P', action: '일시정지' },
  { key: 'R', action: '재시작' },
];

function AsteroidPage() {
  const { data: scores = [], isLoading } = useGetScores('asteroid');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-64">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-[620px] max-w-[620px]">
        <Asteroid />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default AsteroidPage;
