import MainHeader from './_components/MainHeader';
import MainSection from './_components/MainSection';

export default function Home() {
  return (
    <section className="h-full flex flex-col gap-6 w-full max-w-[1820px] mx-auto">
      <MainHeader />
      <MainSection />
    </section>
  );
}
