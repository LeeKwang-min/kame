import KameHeader from '@/components/common/KameHeader';

function BurgerLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      <KameHeader title="Burger Stack" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default BurgerLayout;
