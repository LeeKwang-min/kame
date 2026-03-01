'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLocale } from '@/provider/LocaleProvider';
import { BANNER_ITEMS } from '@/lib/config';
import { TBannerItem } from '@/@types/menus';

function MainBanner() {
  const { locale } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [progress, setProgress] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const total = BANNER_ITEMS.length;

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning || total === 0) return;
      setIsTransitioning(true);
      setProgress(0);
      setCurrentIndex(((index % total) + total) % total);
      setTimeout(() => setIsTransitioning(false), 500);
    },
    [total, isTransitioning],
  );

  const goNext = useCallback(() => {
    goTo(currentIndex + 1);
  }, [currentIndex, goTo]);

  // Auto-rotation timer
  useEffect(() => {
    if (isPaused || total <= 1) return;
    timeoutRef.current = setTimeout(goNext, 5000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, isPaused, goNext, total]);

  // Progress bar animation
  useEffect(() => {
    if (isPaused || total <= 1) {
      setProgress(0);
      return;
    }
    setProgress(0);
    const startTime = Date.now();
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      setProgress(Math.min(elapsed / 5000, 1));
    }, 50);
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, [currentIndex, isPaused, total]);

  if (total === 0) return null;

  const item = BANNER_ITEMS[currentIndex];
  const title = locale === 'ko' ? item.title.kor : item.title.eng;
  const description =
    locale === 'ko' ? item.description.kor : item.description.eng;

  return (
    <div
      className="relative w-full select-none group/banner py-2 sm:py-3"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <BannerSlide
        item={item}
        title={title}
        description={description}
        locale={locale}
        isTransitioning={isTransitioning}
        progress={total > 1 ? progress : undefined}
      />

      {/* Dot indicators */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-2 mt-2 sm:mt-3">
          {BANNER_ITEMS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === currentIndex
                  ? 'bg-arcade-cyan w-6 shadow-[0_0_8px_rgba(34,211,211,0.4)]'
                  : 'bg-arcade-text/20 hover:bg-arcade-text/40 w-2',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface BannerSlideProps {
  item: TBannerItem;
  title: string;
  description: string;
  locale: string;
  isTransitioning: boolean;
  progress?: number;
}

function BannerSlide({
  item,
  title,
  description,
  locale,
  isTransitioning,
  progress,
}: BannerSlideProps) {
  const content = (
    <div
      className={cn(
        'relative w-full rounded-xl overflow-hidden',
        'h-[160px] sm:h-[170px] lg:h-[200px]',
        'border border-arcade-border/60',
        'hover:border-arcade-cyan/30',
        'transition-[border-color,box-shadow] duration-500',
        'hover:shadow-[0_0_20px_rgba(34,211,211,0.08)]',
      )}
    >
      {/* Background layer */}
      {item.type === 'image' ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${item.src})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
      ) : (
        <div
          className={cn('absolute inset-0 bg-gradient-to-r', item.bgColor)}
        />
      )}

      {/* Subtle grid pattern overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />

      {/* Progress bar inside overflow-hidden container */}
      {progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-arcade-border/30 z-20">
          <div
            className="h-full bg-arcade-cyan/60"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}

      {/* Content with fade transition */}
      <div
        className={cn(
          'relative z-10 h-full flex items-center px-4 sm:px-6 lg:px-10 py-4 sm:py-5 lg:py-6',
          'transition-opacity duration-500',
          isTransitioning ? 'opacity-0' : 'opacity-100',
        )}
      >
        <div className="flex flex-col gap-1.5 lg:gap-2">
          {/* Badge for announcements */}
          {item.type === 'announcement' && item.badge && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-arcade-cyan/15 text-arcade-cyan border border-arcade-cyan/25 w-fit backdrop-blur-sm">
              {locale === 'ko' ? item.badge.kor : item.badge.eng}
            </span>
          )}

          {/* Icon for card type */}
          {item.type === 'card' && (
            <span className="text-3xl lg:text-4xl drop-shadow-lg">
              {item.icon}
            </span>
          )}

          <h2 className="text-base sm:text-lg lg:text-2xl font-bold text-white tracking-tight">
            {title}
          </h2>
          <p className="text-xs sm:text-sm lg:text-base text-white/60 max-w-md leading-relaxed line-clamp-2">
            {description}
          </p>

          {/* CTA Button */}
          {(item.type === 'image' || item.type === 'card') &&
            item.ctaText && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1 sm:py-1.5 mt-1',
                  'rounded-lg text-xs sm:text-sm font-bold',
                  'bg-arcade-cyan/15 text-arcade-cyan',
                  'border border-arcade-cyan/25',
                  'hover:bg-arcade-cyan/25 hover:border-arcade-cyan/40',
                  'transition-all duration-200',
                  'w-fit backdrop-blur-sm',
                )}
              >
                {locale === 'ko' ? item.ctaText.kor : item.ctaText.eng}
                <span className="text-xs transition-transform duration-200 group-hover/banner:translate-x-0.5">
                  &rarr;
                </span>
              </span>
            )}
        </div>
      </div>
    </div>
  );

  if ((item.type === 'image' || item.type === 'card') && item.href) {
    return <Link href={item.href}>{content}</Link>;
  }

  return content;
}

export default MainBanner;
