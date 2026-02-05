'use client';

import { useLocale } from '@/provider/LocaleProvider';
import { LocaleKey } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Globe } from 'lucide-react';

function LocaleSelector() {
  const { locale, setLocale, localeNames } = useLocale();

  const toggleLocale = () => {
    const newLocale: LocaleKey = locale === 'ko' ? 'en' : 'ko';
    setLocale(newLocale);
  };

  return (
    <button
      onClick={toggleLocale}
      className={cn(
        'flex items-center gap-1 px-2 py-1 rounded',
        'text-xs text-arcade-text/70 hover:text-arcade-cyan',
        'hover:bg-arcade-border/50 transition-colors',
      )}
      title={localeNames[locale]}>
      <Globe size={14} />
      <span className="uppercase">{locale}</span>
    </button>
  );
}

export default LocaleSelector;
