import KameHeader from '@/components/common/KameHeader';

function SuikaGameLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 py-4 flex flex-col gap-6 items-center sm:px-6 sm:gap-10">
      <KameHeader title="수박 게임" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default SuikaGameLayout;
