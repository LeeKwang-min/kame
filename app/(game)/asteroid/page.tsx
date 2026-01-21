import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import Asteroid from './_components/Asteroid';

const controls = [
  { key: '← →', action: '회전' },
  { key: '↑', action: '가속' },
  { key: 'Space', action: '발사' },
  { key: 'S', action: '게임 시작' },
  { key: 'R', action: '재시작' },
];

function AsteroidPage() {
  return (
    <section className="w-full h-full flex gap-6 items-start">
      <aside className="shrink-0 w-64 space-y-4">
        <ControlInfoTable controls={controls} />
        <RankBoard data={[]} />
      </aside>
      <div className="flex-1 h-full">
        <Asteroid />
      </div>
    </section>
  );
}

export default AsteroidPage;
