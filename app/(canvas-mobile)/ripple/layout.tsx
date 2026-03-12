import KameHeader from '@/components/common/KameHeader';
import JsonLd from '@/components/common/JsonLd';
import { getGameMetadata, getGameJsonLd } from '@/lib/seo';

export const metadata = getGameMetadata('/ripple');
const jsonLd = getGameJsonLd('/ripple');

function RippleLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-4 xl:px-6 py-4 flex flex-col gap-4 xl:gap-10 items-center">
      {jsonLd && <JsonLd data={jsonLd} />}
      <KameHeader title="Ripple" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default RippleLayout;
