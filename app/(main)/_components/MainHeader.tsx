'use client';

import { Menu, Gamepad2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import KameHeader from '@/components/common/KameHeader';
import ThemeSelector from '@/components/common/ThemeSelector';
import LocaleSelector from '@/components/common/LocaleSelector';
import GoogleLoginButton from '@/components/auth/GoogleLoginButton';
import UserProfile from '@/components/auth/UserProfile';
import TotalRankingBoard from '@/components/common/TotalRankingBoard';
import { useLocale } from '@/provider/LocaleProvider';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function MainHeader() {
  const { data: session, status } = useSession();
  const { t } = useLocale();

  return (
    <header className="w-full flex items-center justify-between">
      <KameHeader showSettings={false} />

      <div className="flex items-center gap-3">
        {/* 데스크탑: 테마/언어 셀렉터만 표시 (lg 이상) */}
        <div className="hidden lg:flex items-center gap-3">
          <ThemeSelector />
          <LocaleSelector />
        </div>

        {/* 모바일: 햄버거 메뉴 (lg 미만) */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <button className="p-2 rounded-lg border border-arcade-border bg-arcade-surface text-arcade-text">
                <Menu size={20} />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="bg-arcade-bg border-arcade-border overflow-y-auto">
              <SheetHeader>
                <SheetTitle className="text-arcade-text flex items-center gap-2">
                  <Gamepad2 className="text-arcade-cyan" size={20} />
                  {t.auth.playerZone}
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 p-4">
                <div>
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
                </div>
                <div className="pt-4 border-t border-arcade-border">
                  <TotalRankingBoard />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

export default MainHeader;
