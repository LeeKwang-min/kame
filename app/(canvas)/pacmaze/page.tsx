'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Pacman from './_components/Pacman';

const controls = [
  { key: '\u2191 \u2193 \u2190 \u2192', action: '\uBC29\uD5A5 \uC804\uD658' },
  { key: 'S', action: '\uAC8C\uC784 \uC2DC\uC791 / \uC7AC\uAC1C' },
  { key: 'P', action: '\uC77C\uC2DC\uC815\uC9C0' },
  { key: 'R', action: '\uC7AC\uC2DC\uC791' },
];

function PacmanPage() {
  const { data: scores = [], isLoading } = useGetScores('pacman');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[480px]">
        <Pacman />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default PacmanPage;
