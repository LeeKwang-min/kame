import KameHeader from '@/components/common/KameHeader';

function G2048Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-4 flex flex-col gap-4 xl:gap-10 items-center">
      <KameHeader title="2048" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default G2048Layout;
