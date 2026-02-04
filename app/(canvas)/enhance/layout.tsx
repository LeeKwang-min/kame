import KameHeader from '@/components/common/KameHeader';

function EnhanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Enhance Simulator" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default EnhanceLayout;
