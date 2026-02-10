'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import LightsOut from './_components/LightsOut';

const controls = [
  { key: 'Click', action: '셀 토글' },
  { key: '방향키', action: '커서 이동' },
  { key: 'Space', action: '셀 토글 (키보드)' },
  { key: 'Z', action: '되돌리기' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
  { key: 'ESC', action: '종료 & 점수 저장' },
];

function LightsOutPage() {
  const { data: scores = [], isLoading } = useGetScores('lightsout');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[500px]">
        <LightsOut />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default LightsOutPage;
