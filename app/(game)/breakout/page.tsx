import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import BreakOut from './_components/BreakOut';

const controls = [
  { key: '← →', action: '패들 이동' },
  { key: 'Space', action: '공 발사' },
  { key: 'S', action: '게임 시작' },
  { key: 'R', action: '재시작' },
];

function BreakOutPage() {
  return (
    <section className="w-full h-full flex gap-6 items-start">
      <aside className="shrink-0 w-64 space-y-4">
        <ControlInfoTable controls={controls} />
        <RankBoard data={[]} />
      </aside>
      <div className="flex-1 h-full">
        <BreakOut />
      </div>
    </section>
  );
}

export default BreakOutPage;
