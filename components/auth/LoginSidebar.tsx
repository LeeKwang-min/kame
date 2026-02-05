'use client';

import { useSession } from 'next-auth/react';
import GoogleLoginButton from './GoogleLoginButton';
import UserProfile from './UserProfile';
import { cn } from '@/lib/utils';
import { Gamepad2 } from 'lucide-react';
import { useLocale } from '@/provider/LocaleProvider';
import TotalRankingBoard from '@/components/common/TotalRankingBoard';

interface IProps {
  className?: string;
}

function LoginSidebar({ className }: IProps) {
  const { data: session, status } = useSession();
  const { t } = useLocale();

  return (
    <aside
      className={cn(
        'w-72 shrink-0 p-4',
        'bg-arcade-surface rounded-lg',
        'border border-arcade-border',
        'relative overflow-hidden',
        className,
      )}>
      <div
        className={cn(
          'absolute inset-0 rounded-lg',
          'bg-gradient-to-b from-arcade-cyan/5 to-arcade-magenta/5',
          'pointer-events-none',
        )}
      />

      <div className="relative z-10 flex flex-col gap-6 w-full">
        <div className="flex items-center gap-2 pb-4 border-b border-arcade-border">
          <Gamepad2 className="text-arcade-cyan" size={24} />
          <span className="text-lg font-bold text-arcade-text">
            {t.auth.playerZone}
          </span>
        </div>

        {status === 'loading' ? (
          <div className="flex flex-col gap-4 animate-pulse">
            <div className="w-16 h-16 rounded-full bg-arcade-border mx-auto" />
            <div className="h-4 bg-arcade-border rounded w-24 mx-auto" />
            <div className="h-9 bg-arcade-border rounded" />
          </div>
        ) : session?.user ? (
          <UserProfile user={session.user} />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-arcade-text/70 text-center">
              {t.auth.loginToSave}
            </p>
            <GoogleLoginButton />
          </div>
        )}

        <div className="pt-4 border-t border-arcade-border">
          <TotalRankingBoard />
        </div>
      </div>
    </aside>
  );
}

export default LoginSidebar;
