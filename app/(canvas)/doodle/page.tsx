import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import Doodle from './_components/Doodle';

const controls = [
  { key: '← →', action: '좌우 이동' },
  { key: 'S', action: '게임 시작' },
  { key: 'R', action: '재시작' },
];

function DoodlePage() {
  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-64">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-[600px] max-w-[400px]">
        <Doodle />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={[]} />
      </aside>
    </section>
  );
}

export default DoodlePage;
