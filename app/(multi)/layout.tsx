import KameHeader from '@/components/common/KameHeader';

function MultiLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 sm:px-6 py-4 flex flex-col gap-6 sm:gap-10 items-center">
      <KameHeader title="Multiplayer" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default MultiLayout;
