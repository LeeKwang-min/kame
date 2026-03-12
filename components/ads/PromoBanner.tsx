'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PROMOS, TPromo } from './promos';

function getRandomPromo(exclude?: string): TPromo {
  const filtered = exclude
    ? PROMOS.filter((p) => p.href !== exclude)
    : PROMOS;
  return filtered[Math.floor(Math.random() * filtered.length)];
}

type TPromoBannerProps = {
  maxWidth?: number;
  className?: string;
  exclude?: string;
};

export function PromoBanner({ maxWidth, className, exclude }: TPromoBannerProps) {
  const [promo] = useState(() => getRandomPromo(exclude));

  const content = (
    <div
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-lg border border-arcade-border bg-arcade-surface hover:border-arcade-cyan/50 transition-colors text-center ${className ?? ''}`}
      style={{ maxWidth }}
    >
      <span className="text-2xl">{promo.emoji}</span>
      <p className="text-sm font-bold text-arcade-text">{promo.title}</p>
      <p className="text-xs text-arcade-text/60">{promo.description}</p>
    </div>
  );

  if (promo.external) {
    return (
      <a href={promo.href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return <Link href={promo.href}>{content}</Link>;
}
