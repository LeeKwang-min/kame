import KameHeader from '@/components/common/KameHeader';

function PuyoPuyoLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Puyo Puyo" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default PuyoPuyoLayout;
