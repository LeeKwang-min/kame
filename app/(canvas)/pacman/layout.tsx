import KameHeader from '@/components/common/KameHeader';

function PacmanLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Pac-Man" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default PacmanLayout;
