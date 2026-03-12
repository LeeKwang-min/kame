import KameHeader from '@/components/common/KameHeader';
import JsonLd from '@/components/common/JsonLd';
import { getGameMetadata, getGameJsonLd } from '@/lib/seo';

export const metadata = getGameMetadata('/suikagame');
const jsonLd = getGameJsonLd('/suikagame');

function SuikaGameLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 py-4 flex flex-col gap-6 items-center sm:px-6 sm:gap-10">
      {jsonLd && <JsonLd data={jsonLd} />}
      <KameHeader title="Watermelon Game" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default SuikaGameLayout;
