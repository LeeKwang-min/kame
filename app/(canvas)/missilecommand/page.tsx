'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import MissileCommand from './_components/MissileCommand';

const controls = [
  { key: '마우스 클릭', action: '포탑 발사' },
  { key: 'S', action: '게임 시작' },
  { key: 'R', action: '재시작' },
];

function MissileCommandPage() {
  const { data: scores = [], isLoading } = useGetScores('missilecommand');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-64">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[800px]">
        <MissileCommand />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default MissileCommandPage;
