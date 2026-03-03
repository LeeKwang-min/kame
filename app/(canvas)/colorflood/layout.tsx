import KameHeader from '@/components/common/KameHeader';
import JsonLd from '@/components/common/JsonLd';
import { getGameMetadata, getGameJsonLd } from '@/lib/seo';

export const metadata = getGameMetadata('/colorflood');
const jsonLd = getGameJsonLd('/colorflood');

function ColorFloodLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      {jsonLd && <JsonLd data={jsonLd} />}
      <KameHeader title="Color Flood" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default ColorFloodLayout;
