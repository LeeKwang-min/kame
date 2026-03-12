import MainHeader from './_components/MainHeader';
import MainSection from './_components/MainSection';
import MainFooter from './_components/MainFooter';

export default function Home() {
  return (
    <section className="h-full flex flex-col gap-3 sm:gap-6 w-full max-w-[1820px] mx-auto">
      <MainHeader />
      <MainSection />
      <MainFooter />
    </section>
  );
}
