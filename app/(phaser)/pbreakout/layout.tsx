import KameHeader from '@/components/common/KameHeader';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Phaser Breakout | KAME',
  description: 'Phaser.js로 제작된 Breakout 게임입니다.',
  keywords: ['Phaser', '웹 게임', 'HTML5 게임', 'KAME'],
};

function BreakoutLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Breakout" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default BreakoutLayout;
