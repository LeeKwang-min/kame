import KameHeader from '@/components/common/KameHeader';
import JsonLd from '@/components/common/JsonLd';
import { getGameMetadata, getGameJsonLd } from '@/lib/seo';

export const metadata = getGameMetadata('/kero33');
const jsonLd = getGameJsonLd('/kero33');

function Kero33Layout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      {jsonLd && <JsonLd data={jsonLd} />}
      <KameHeader title="Kero33" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default Kero33Layout;
