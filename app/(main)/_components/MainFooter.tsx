import Link from 'next/link';
import { SITE_NAME } from '@/lib/constants';

function MainFooter() {
  return (
    <footer className="w-full border-t border-arcade-border pt-4 pb-2 mt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-arcade-text/40">
      <span>&copy; {new Date().getFullYear()} {SITE_NAME}</span>
      <nav className="flex gap-4">
        <Link href="/privacy" className="hover:text-arcade-text/70 transition-colors">
          개인정보처리방침
        </Link>
        <Link href="/terms" className="hover:text-arcade-text/70 transition-colors">
          이용약관
        </Link>
      </nav>
    </footer>
  );
}

export default MainFooter;
