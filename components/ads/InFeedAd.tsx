'use client';

import { useEffect, useRef, useState } from 'react';
import { useAds } from './AdProvider';
import { AD_SLOTS, INFEED_LAYOUT_KEY } from './config';

type TInFeedAdProps = {
  className?: string;
};

export function InFeedAd({ className }: TInFeedAdProps) {
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
    return null;
  }

  return (
    <ins
      ref={adRef}
      className={`adsbygoogle block w-full ${className ?? ''}`}
      style={{ minHeight: 90 }}
      data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
      data-ad-slot={AD_SLOTS.infeed}
      data-ad-format="fluid"
      data-ad-layout-key={INFEED_LAYOUT_KEY}
    />
  );
}
