'use client';

import { useEffect, useRef, useState } from 'react';
import { useAds } from './AdProvider';
import { AD_SLOTS } from './config';
import { PromoBanner } from './PromoBanner';
import { TAdSlot } from '@/@types/ads';

type TSidebarAdProps = {
  slot?: TAdSlot;
  maxWidth?: number;
  className?: string;
};

export function SidebarAd({ slot = 'sidebar-left', maxWidth = 288, className }: TSidebarAdProps) {
  const { adsEnabled } = useAds();
  const adRef = useRef<HTMLModElement>(null);
  const isLoaded = useRef(false);
  const [adFailed, setAdFailed] = useState(false);

  useEffect(() => {
    if (!adsEnabled || isLoaded.current) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      isLoaded.current = true;
    } catch {
      setAdFailed(true);
    }
  }, [adsEnabled]);

  useEffect(() => {
    if (!adsEnabled || !adRef.current) return;
    const observer = new MutationObserver(() => {
      const status = adRef.current?.getAttribute('data-ad-status');
      if (status === 'unfilled') setAdFailed(true);
    });
    observer.observe(adRef.current, { attributes: true, attributeFilter: ['data-ad-status'] });
    return () => observer.disconnect();
  }, [adsEnabled]);

  if (adFailed) return null;

  if (!adsEnabled) {
    return <PromoBanner maxWidth={maxWidth} className={className} />;
  }

  return (
    <div className={`sticky top-4 ${className ?? ''}`} style={{ maxWidth }}>
      <ins
        ref={adRef}
        className="adsbygoogle block"
        style={{ display: 'block', maxWidth }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot={AD_SLOTS[slot] ?? AD_SLOTS['sidebar-left']}
        data-ad-format="auto"
        data-full-width-responsive="false"
      />
    </div>
  );
}
