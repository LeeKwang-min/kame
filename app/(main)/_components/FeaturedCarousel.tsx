'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Gamepad2, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/provider/LocaleProvider';
import { FEATURED_GAMES, MENU_LIST } from '@/lib/config';
import { GAME_ICONS } from '@/components/common/GameCard';

function FeaturedCarousel() {
  const { locale } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = FEATURED_GAMES.length;

  const games = FEATURED_GAMES.map((featured) => {
    const menu = MENU_LIST.find((m) => m.href === featured.href);
    const Icon = GAME_ICONS[featured.href] || Gamepad2;
    return {
      href: featured.href,
      name: menu
        ? locale === 'ko'
          ? menu.name.kor
          : menu.name.eng
        : featured.href,
      description:
        locale === 'ko' ? featured.description.kor : featured.description.eng,
      Icon,
    };
  });

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning) return;
      setIsTransitioning(true);
      setCurrentIndex(((index % total) + total) % total);
      setTimeout(() => setIsTransitioning(false), 400);
    },
    [total, isTransitioning],
  );

  const goNext = useCallback(() => {
    goTo(currentIndex + 1);
  }, [currentIndex, goTo]);

  const goPrev = useCallback(() => {
    goTo(currentIndex - 1);
  }, [currentIndex, goTo]);

  useEffect(() => {
    if (isPaused) return;
    timeoutRef.current = setTimeout(goNext, 5000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, isPaused, goNext]);

  const getSlideIndex = (offset: number) =>
    ((currentIndex + offset) % total + total) % total;

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Title */}
      <div className="flex items-center justify-center gap-2 mb-1">
        <Star className="w-4 h-4 text-arcade-cyan fill-arcade-cyan" />
        <h2 className="text-sm font-bold tracking-wider text-arcade-text/80 uppercase">
          {locale === 'ko' ? '추천 게임' : 'Featured Games'}
        </h2>
        <Star className="w-4 h-4 text-arcade-cyan fill-arcade-cyan" />
      </div>

      {/* Carousel container */}
      <div className="relative flex items-center justify-center gap-3 py-4 overflow-hidden">
        {/* Left arrow */}
        <button
          onClick={goPrev}
          className={cn(
            'z-10 shrink-0 p-2 rounded-full',
            'bg-arcade-surface/80 border border-arcade-border',
            'text-arcade-text/60 hover:text-arcade-cyan hover:border-arcade-cyan',
            'transition-all duration-200',
          )}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Cards */}
        <div className="relative flex items-center justify-center gap-3 w-full max-w-3xl">
          {/* Previous card (desktop only) */}
          <div className="hidden lg:block w-1/4 shrink-0">
            <CarouselCard
              game={games[getSlideIndex(-1)]}
              variant="side"
              tabIndex={-1}
            />
          </div>

          {/* Center card */}
          <div className="flex-1 max-w-md">
            <CarouselCard game={games[currentIndex]} variant="center" />
          </div>

          {/* Next card (desktop only) */}
          <div className="hidden lg:block w-1/4 shrink-0">
            <CarouselCard
              game={games[getSlideIndex(1)]}
              variant="side"
              tabIndex={-1}
            />
          </div>
        </div>

        {/* Right arrow */}
        <button
          onClick={goNext}
          className={cn(
            'z-10 shrink-0 p-2 rounded-full',
            'bg-arcade-surface/80 border border-arcade-border',
            'text-arcade-text/60 hover:text-arcade-cyan hover:border-arcade-cyan',
            'transition-all duration-200',
          )}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Dot indicators */}
      <div className="flex items-center justify-center gap-2 pb-2">
        {games.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={cn(
              'w-2 h-2 rounded-full transition-all duration-300',
              i === currentIndex
                ? 'bg-arcade-cyan w-4'
                : 'bg-arcade-text/30 hover:bg-arcade-text/50',
            )}
          />
        ))}
      </div>
    </div>
  );
}

interface CarouselCardProps {
  game: {
    href: string;
    name: string;
    description: string;
    Icon: React.ComponentType<{ className?: string }>;
  };
  variant: 'center' | 'side';
  tabIndex?: number;
}

function CarouselCard({ game, variant, tabIndex }: CarouselCardProps) {
  const isCenter = variant === 'center';

  return (
    <Link href={game.href} tabIndex={tabIndex}>
      <div
        className={cn(
          'group relative flex flex-col items-center justify-center',
          'rounded-xl border transition-all duration-400',
          'bg-arcade-surface',
          isCenter
            ? [
                'py-8 px-6',
                'border-arcade-cyan/50',
                'shadow-[0_0_20px_rgba(0,255,245,0.3)]',
                'scale-100 opacity-100',
                'hover:shadow-[0_0_30px_rgba(0,255,245,0.5)]',
              ]
            : [
                'py-6 px-4',
                'border-arcade-border',
                'scale-90 opacity-50',
              ],
        )}
      >
        {/* Gradient overlay */}
        <div
          className={cn(
            'absolute inset-0 rounded-xl',
            'bg-gradient-to-br from-arcade-cyan/10 to-arcade-magenta/10',
            isCenter ? 'opacity-100' : 'opacity-0',
            'transition-opacity duration-300',
          )}
        />

        <game.Icon
          className={cn(
            'relative z-10 mb-3 transition-colors duration-300',
            isCenter
              ? 'w-12 h-12 text-arcade-cyan group-hover:text-arcade-cyan'
              : 'w-8 h-8 text-arcade-cyan/50',
          )}
        />
        <h3
          className={cn(
            'relative z-10 font-bold text-center transition-colors duration-300',
            isCenter
              ? 'text-lg text-arcade-text group-hover:text-white'
              : 'text-sm text-arcade-text/60',
          )}
        >
          {game.name}
        </h3>
        {isCenter && (
          <p className="relative z-10 mt-1 text-sm text-arcade-text/60 text-center">
            {game.description}
          </p>
        )}
      </div>
    </Link>
  );
}

export default FeaturedCarousel;
