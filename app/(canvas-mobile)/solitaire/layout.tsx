import KameHeader from '@/components/common/KameHeader';
import JsonLd from '@/components/common/JsonLd';
import { getGameMetadata, getGameJsonLd } from '@/lib/seo';

export const metadata = getGameMetadata('/solitaire');
const jsonLd = getGameJsonLd('/solitaire');

function SolitaireLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-4 pb-[60px] sm:pb-[100px] flex flex-col gap-4 xl:gap-10 items-center">
      {jsonLd && <JsonLd data={jsonLd} />}
      <KameHeader title="Solitaire" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default SolitaireLayout;
