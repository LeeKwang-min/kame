'use client';

import ControlInfoTable from '@/components/common/ControlInfoTable';
import RankBoard from '@/components/common/RankBoard';
import { useGetScores } from '@/service/scores';
import Typingfall from './_components/Typingfall';

const controls = [
  { key: 'A-Z', action: '타이핑' },
  { key: 'Enter', action: '단어 제출' },
  { key: 'Backspace', action: '글자 삭제' },
  { key: 'Esc', action: '일시 정지' },
  { key: 'S', action: '시작 / 재개' },
  { key: 'P', action: '일시 정지' },
  { key: 'R', action: '재시작' },
];

function TypingfallPage() {
  const { data: scores = [], isLoading } = useGetScores('typingfall');

  return (
    <section className="w-full h-full flex gap-6 items-start justify-center">
      <aside className="shrink-0 w-72">
        <ControlInfoTable controls={controls} />
      </aside>
      <div className="flex-1 h-full max-w-[800px]">
        <Typingfall />
      </div>
      <aside className="shrink-0 w-64">
        <RankBoard data={scores} isLoading={isLoading} showCountry />
      </aside>
    </section>
  );
}

export default TypingfallPage;
