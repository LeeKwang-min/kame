'use client';

import { useEffect, useRef, useState } from 'react';
import { useAds } from './AdProvider';
import { AD_SLOTS } from './config';

export function AnchorAd() {
  const { adsEnabled, anchorVisible } = useAds();
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
  if (!anchorVisible) return null;

  if (!adsEnabled) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-center border-t border-dashed border-orange-400/40 bg-arcade-bg/90 text-orange-400/60 text-xs py-2">
        Ad Placeholder (Anchor)
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-arcade-bg/90">
      <ins
        ref={adRef}
        className="adsbygoogle block w-full"
        style={{ minHeight: 50 }}
        data-ad-client={process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID}
        data-ad-slot={AD_SLOTS.anchor}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
