import KameHeader from '@/components/common/KameHeader';

function RhythmBeatLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-3 flex flex-col gap-3 xl:gap-4 items-center">
      <KameHeader title="리듬 비트" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default RhythmBeatLayout;
