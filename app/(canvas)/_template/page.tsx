'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Template from './_components/Template';

// TODO: 'dodge'를 실제 게임 타입으로 변경하세요
const GAME_TYPE = 'dodge' as const;

const controls = [
  { key: '↑ ↓ ← →', action: '이동' },
  { key: 'S', action: '게임 시작' },
  { key: 'R', action: '재시작' },
];

function TemplatePage() {
  const { data: scores = [], isLoading } = useGetScores(GAME_TYPE);

  return (
    <section className="w-full h-full flex gap-6 items-start">
      <aside className="shrink-0 w-64 space-y-4">
        <ControlInfoTable controls={controls} />
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
      <div className="flex-1 h-full">
        <Template />
      </div>
    </section>
  );
}

export default TemplatePage;
