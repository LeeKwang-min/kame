import KameHeader from '@/components/common/KameHeader';
import JsonLd from '@/components/common/JsonLd';
import { getGameMetadata, getGameJsonLd } from '@/lib/seo';

export const metadata = getGameMetadata('/maze');
const jsonLd = getGameJsonLd('/maze');

function MazeLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full h-screen px-6 py-4 flex flex-col gap-10 items-center">
      {jsonLd && <JsonLd data={jsonLd} />}
      <KameHeader title="Maze Escape" />
      <section className="w-full h-full">{children}</section>
    </main>
  );
}

export default MazeLayout;
