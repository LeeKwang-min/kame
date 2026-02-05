'use client';

import { useSession } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useLocale } from '@/provider/LocaleProvider';

function InitialsAlert() {
  const { data: session, status } = useSession();
  const { t } = useLocale();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (
      status === 'authenticated' &&
      session?.user &&
      !session.user.initials &&
      !isDismissed
    ) {
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
    setIsVisible(false);
  }, [status, session, isDismissed]);

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 z-50',
        'max-w-sm p-4 rounded-lg',
        'bg-arcade-surface border border-arcade-yellow/50',
        'shadow-[0_0_20px_rgba(255,255,0,0.2)]',
        'animate-in slide-in-from-bottom-5 fade-in duration-300',
      )}>
      <button
        onClick={() => setIsDismissed(true)}
        className={cn(
          'absolute top-2 right-2',
          'text-arcade-text/50 hover:text-arcade-text',
          'transition-colors',
        )}>
        <X size={16} />
      </button>

      <div className="flex items-start gap-3">
        <AlertTriangle className="text-arcade-yellow shrink-0 mt-0.5" size={20} />
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold text-arcade-text">
            {t.alert.setInitialsTitle}
          </p>
          <p className="text-xs text-arcade-text/70">
            {t.alert.setInitialsDescription}
          </p>
          <Link
            href="/mypage"
            className={cn(
              'inline-flex items-center justify-center',
              'px-3 py-1.5 rounded text-xs font-bold',
              'bg-arcade-yellow/20 text-arcade-yellow',
              'hover:bg-arcade-yellow/30',
              'border border-arcade-yellow/50',
              'transition-colors',
            )}>
            {t.common.myPage}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default InitialsAlert;
