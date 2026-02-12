'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import RandomDefense from './_components/RandomDefense';

const controls = [
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
  { key: 'Space / D', action: '유닛 소환' },
  { key: 'F', action: '다음 웨이브 강제 호출 (골드 보너스)' },
  { key: 'Drag', action: '유닛 이동 / 합성 / 위치 교환' },
  { key: 'Del / 우클릭', action: '유닛 매각' },
  { key: '- / +', action: '볼륨 조절' },
  { key: 'M', action: '음소거 토글' },
];

function RandomDefensePage() {
  const { data: scores = [], isLoading } = useGetScores('randomdefense');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[1200px]">
        <RandomDefense />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default RandomDefensePage;
