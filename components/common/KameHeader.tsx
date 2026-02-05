'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import LocaleSelector from '@/components/common/LocaleSelector';
import ThemeSelector from '@/components/common/ThemeSelector';

interface IProps {
  title?: string;
  className?: string;
  showSettings?: boolean;
}

function KameHeader({ title, className, showSettings = true }: IProps) {
  return (
    <header
      className={cn('w-full flex items-center justify-between', className)}>
      <Link href="/">
        <div className="relative w-[80px] h-[36px] group flex items-center justify-center">
          <h2
            className={cn(
              'text-2xl font-bold',
              'text-arcade-cyan',
              // 'group-hover:opacity-0 transition-opacity duration-300',
              'drop-shadow-[0_0_10px_rgba(0,255,245,0.5)]',
            )}>
            KAME
          </h2>
          {/* <Image
            src="/image/logo.gif"
            alt="Kame animated"
            fill
            className="object-contain opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          /> */}
        </div>
      </Link>

      <div className="flex items-center gap-3">
        {title && (
          <h2 className="text-xl font-bold text-center text-arcade-text mr-4">
            {title}
          </h2>
        )}
        {showSettings && (
          <>
            <ThemeSelector />
            <LocaleSelector />
          </>
        )}
      </div>
    </header>
  );
}

export default KameHeader;
