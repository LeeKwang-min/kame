import KameHeader from '@/components/common/KameHeader';

function WheelLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-6 items-center">
      <KameHeader title="Spinning Wheel" />
      <section className="w-full flex-1 overflow-hidden">{children}</section>
    </main>
  );
}

export default WheelLayout;
