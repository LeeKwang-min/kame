'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { AnchorAd, SidebarAd } from '@/components/ads';
import dynamic from 'next/dynamic';

// dynamic import: SSR 비활성화
// Phaser는 window 객체를 사용하므로 서버에서 실행되면 에러 발생
const PhaserGame = dynamic(() => import('./_components/PhaserGame'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] flex items-center justify-center bg-black text-white">
      Loading game...
    </div>
  ),
});

// 조작법 안내 데이터
const controls = [
  { key: '← →', action: '패들 이동' },
  { key: 'SPACE', action: '공 발사' },
  { key: 'R', action: '재시작' },
];

function BreakoutPage() {
  return (
    <section className="w-full h-full flex gap-6 items-start">
      <aside className="shrink-0 w-64 space-y-4">
        <ControlInfoTable controls={controls} />
        <RankBoard data={[]} />
        <SidebarAd slot="sidebar-left" />
      </aside>
      <div className="flex-1 h-full">
        <PhaserGame />
      </div>
      <AnchorAd />
    </section>
  );
}

export default BreakoutPage;
