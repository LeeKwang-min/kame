import KameHeader from '@/components/common/KameHeader';
import JsonLd from '@/components/common/JsonLd';
import { getGameMetadata, getGameJsonLd } from '@/lib/seo';

export const metadata = getGameMetadata('/tapempire');
const jsonLd = getGameJsonLd('/tapempire');

function TapEmpireLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-4 pb-[60px] sm:pb-[100px] flex flex-col gap-4 xl:gap-10 items-center">
      {jsonLd && <JsonLd data={jsonLd} />}
      <KameHeader title="Tap Empire" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default TapEmpireLayout;
