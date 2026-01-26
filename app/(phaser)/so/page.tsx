'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import dynamic from 'next/dynamic';

const PhaserGame = dynamic(() => import('./_components/PhaserGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-black text-white">
      Loading game...
    </div>
  ),
});

const controls = [
  { key: '↑ ↓ ← →', action: '이동' },
  { key: 'SPACE', action: '액션 / 재시작' },
  { key: 'R', action: '재시작' },
];

function PhaserTemplatePage() {
  return (
    <section className="w-full h-full flex gap-6 items-start">
      <aside className="shrink-0 w-64 space-y-4">
        <ControlInfoTable controls={controls} />
        <RankBoard data={[]} />
      </aside>
      <div className="flex-1 h-full">
        <PhaserGame />
      </div>
    </section>
  );
}

export default PhaserTemplatePage;
