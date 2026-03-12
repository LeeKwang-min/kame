'use client';

import { useState } from 'react';
import { TMenu } from '@/@types/menus';
import { cn } from '@/lib/utils';
import { Lock } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale } from '@/provider/LocaleProvider';

interface IProps {
  menu: TMenu;
}

function GameCard({ menu }: IProps) {
  const { locale } = useLocale();
  const gameName = locale === 'ko' ? menu.name.kor : menu.name.eng;
  const [imgSrc, setImgSrc] = useState(`/image/games/${menu.href.slice(1)}.svg`);

  if (menu.disabled) {
    return (
      <div
        className={cn(
          'relative flex flex-col items-center justify-center',
          'aspect-square p-4 rounded-lg',
          'bg-arcade-surface border border-arcade-border',
          'cursor-not-allowed opacity-50',
          'transition-[border-color,box-shadow,opacity] duration-300',
        )}>
        <Lock className="absolute top-2 right-2 w-4 h-4 text-arcade-text/50" aria-hidden="true" />
        <Image
          src={imgSrc}
          alt={gameName}
          width={48}
          height={48}
          className="mb-2 grayscale opacity-30"
          onError={() => setImgSrc('/image/games/default.svg')}
        />
        <span className="text-sm font-bold text-arcade-text/50 text-center">
          {gameName}
        </span>
      </div>
    );
  }

  return (
    <Link href={menu.href} target={menu.target ?? '_self'} aria-label={gameName}>
      <div
        className={cn(
          'group relative flex flex-col items-center justify-center',
          'aspect-square p-4 rounded-lg',
          'bg-arcade-surface border border-arcade-border',
          'cursor-pointer',
          'transition-[transform,border-color,box-shadow] duration-300',
          'hover:scale-105',
          'hover:border-arcade-cyan',
          'hover:shadow-[0_0_20px_rgba(0,255,245,0.3)]',
        )}>
        <div
          className={cn(
            'absolute inset-0 rounded-lg opacity-0',
            'bg-gradient-to-br from-arcade-cyan/10 to-arcade-magenta/10',
            'group-hover:opacity-100 transition-opacity duration-300',
          )}
        />
        <Image
          src={imgSrc}
          alt={gameName}
          width={48}
          height={48}
          className={cn(
            'mb-2 relative z-10 rounded-lg',
            'group-hover:brightness-110',
            'transition-[filter] duration-300',
          )}
          onError={() => setImgSrc('/image/games/default.svg')}
        />
        <span
          className={cn(
            'text-sm font-bold text-center relative z-10',
            'text-arcade-text/80',
            'group-hover:text-arcade-text',
            'transition-colors duration-300',
          )}>
          {gameName}
        </span>
      </div>
    </Link>
  );
}

export default GameCard;
