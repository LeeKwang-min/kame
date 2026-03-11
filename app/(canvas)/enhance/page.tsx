'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import { AnchorAd, SidebarAd } from '@/components/ads';
import Enhance from './_components/Enhance';

const controls = [
  { key: 'Space / Enter', action: '강화' },
  { key: 'R', action: '재시작' },
];

function EnhancePage() {
  const { data: scores = [], isLoading } = useGetScores('enhance');

  return (
    <>
      <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
        <SidebarAd slot="sidebar-left" maxWidth={288} />
      </aside>
      <div className="flex-1 h-full max-w-[620px]">
        <Enhance />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
        <SidebarAd slot="sidebar-right" maxWidth={256} />
      </aside>
    </section>
      <AnchorAd />
    </>
  );
}

export default EnhancePage;
