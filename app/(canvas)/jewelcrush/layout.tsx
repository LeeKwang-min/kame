import KameHeader from '@/components/common/KameHeader';
import JsonLd from '@/components/common/JsonLd';
import { getGameMetadata, getGameJsonLd } from '@/lib/seo';

export const metadata = getGameMetadata('/jewelcrush');
const jsonLd = getGameJsonLd('/jewelcrush');

function JewelCrushLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 pb-[60px] sm:pb-[100px] flex flex-col gap-10 items-center">
      {jsonLd && <JsonLd data={jsonLd} />}
      <KameHeader title="Jewel Crush" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default JewelCrushLayout;
