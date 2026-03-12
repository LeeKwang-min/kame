'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import { SidebarAd } from '@/components/ads';
import RPS from './_components/RPS';

const controls = [
  { key: '←', action: '가위' },
  { key: '↑', action: '바위' },
  { key: '→', action: '보' },
  { key: 'R', action: '재시작' },
];

function RPSPage() {
  const { data: scores = [], isLoading } = useGetScores('rps');

  return (
      <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
        <SidebarAd slot="sidebar-left" maxWidth={288} />
      </aside>
      <div className="flex-1 h-full max-w-[620px]">
        <RPS />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
        <SidebarAd slot="sidebar-right" maxWidth={256} />
      </aside>
    </section>
  );
}

export default RPSPage;
