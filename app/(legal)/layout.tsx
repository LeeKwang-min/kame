import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';

function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="w-full min-h-dvh bg-arcade-bg px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto">
        <nav className="mb-8">
          <Link
            href="/"
            className="text-arcade-cyan hover:underline text-sm font-mono"
          >
            &larr; {SITE_NAME}
          </Link>
        </nav>
        {children}
      </div>
    </main>
  );
}

export default LegalLayout;
