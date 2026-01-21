import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import Kero33 from './_components/Kero33';

const controls = [{ key: '↑ ↓ ← →', action: '이동' }];

function Kero33Page() {
  return (
    <section className="w-full h-full flex gap-6 items-start">
      <aside className="shrink-0 w-64 space-y-4">
        <ControlInfoTable controls={controls} />
        <RankBoard data={[]} />
      </aside>
      <div className="flex-1 h-full">
        <Kero33 />
      </div>
    </section>
  );
}

export default Kero33Page;
