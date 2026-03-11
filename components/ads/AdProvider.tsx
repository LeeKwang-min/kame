'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type TAdContext = {
  adsEnabled: boolean;
  anchorVisible: boolean;
  hideAnchor: () => void;
  showAnchor: () => void;
};

const AdContext = createContext<TAdContext>({
  adsEnabled: false,
  anchorVisible: true,
  hideAnchor: () => {},
  showAnchor: () => {},
});

export function AdProvider({ children }: { children: React.ReactNode }) {
  const adsEnabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === 'true';
  const [anchorVisible, setAnchorVisible] = useState(true);

  const hideAnchor = useCallback(() => setAnchorVisible(false), []);
  const showAnchor = useCallback(() => setAnchorVisible(true), []);

  const value = useMemo(
    () => ({ adsEnabled, anchorVisible, hideAnchor, showAnchor }),
    [adsEnabled, anchorVisible, hideAnchor, showAnchor],
  );

  return <AdContext.Provider value={value}>{children}</AdContext.Provider>;
}

export function useAds() {
  return useContext(AdContext);
}
