import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import Platformer from './_components/Platformer';

const controls = [
  { key: 'S', action: '게임 시작' },
  { key: 'R', action: '재시작' },
];

function PlatformerPage() {
  return (
    <section className="w-full h-full flex gap-6 items-start">
      <aside className="shrink-0 w-64 space-y-4">
        <ControlInfoTable controls={controls} />
        <RankBoard data={[]} />
      </aside>
      <div className="flex-1 h-full">
        <Platformer />
      </div>
    </section>
  );
}

export default PlatformerPage;
