import KameHeader from '@/components/common/KameHeader';
import JsonLd from '@/components/common/JsonLd';
import { getGameMetadata, getGameJsonLd } from '@/lib/seo';

export const metadata = getGameMetadata('/wheel');
const jsonLd = getGameJsonLd('/wheel');

function WheelLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-6 items-center">
      {jsonLd && <JsonLd data={jsonLd} />}
      <KameHeader title="Spinning Wheel" />
      <section className="w-full flex-1 overflow-hidden">{children}</section>
    </main>
  );
}

export default WheelLayout;
