import KameHeader from '@/components/common/KameHeader';

function CookieBakeryLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-4 flex flex-col gap-4 xl:gap-10 items-center">
      <KameHeader title="쿠키 공장" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default CookieBakeryLayout;
