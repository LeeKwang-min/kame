import KameHeader from '@/components/common/KameHeader';
import JsonLd from '@/components/common/JsonLd';
import { getGameMetadata, getGameJsonLd } from '@/lib/seo';

export const metadata = getGameMetadata('/slidingpuzzle');
const jsonLd = getGameJsonLd('/slidingpuzzle');

function SlidingPuzzleLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      {jsonLd && <JsonLd data={jsonLd} />}
      <KameHeader title="Sliding Puzzle" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default SlidingPuzzleLayout;
