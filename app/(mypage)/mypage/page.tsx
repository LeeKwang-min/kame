'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import InitialsForm from './_components/InitialsForm';
import GameHistory from './_components/GameHistory';
import CharacterAvatar from '@/components/auth/CharacterAvatar';
import CharacterSelector from '@/components/character/CharacterSelector';
import KameHeader from '@/components/common/KameHeader';
import { cn } from '@/lib/utils';
import { ArrowLeft, Settings, User } from 'lucide-react';
import Link from 'next/link';
import { useLocale } from '@/provider/LocaleProvider';
import { TCharacterType } from '@/lib/character/config';

export default function MyPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const { t } = useLocale();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  const handleUpdateInitials = async (initials: string) => {
    const res = await fetch('/api/user/initials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initials }),
    });

    if (!res.ok) {
      throw new Error('Failed to update initials');
    }

    await update();
  };

  const handleUpdateCharacter = async (character: TCharacterType) => {
    const res = await fetch('/api/user/character', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ character }),
    });

    if (!res.ok) {
      throw new Error('Failed to update character');
    }

    await update();
  };

  if (status === 'loading') {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <KameHeader title={t.myPage.title} />
        <div className="mt-8 animate-pulse">
          <div className="h-32 bg-arcade-surface rounded-lg" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col gap-6">
      <KameHeader title={t.myPage.title} />

      <Link
        href="/"
        className={cn(
          'flex items-center gap-2 text-sm text-arcade-text/60',
          'hover:text-arcade-cyan transition-colors',
        )}>
        <ArrowLeft size={16} />
        {t.common.backToHome}
      </Link>

      <div
        className={cn(
          'p-6 rounded-lg',
          'bg-arcade-surface border border-arcade-border',
        )}>
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-arcade-border">
          <CharacterAvatar
            image={session.user.image}
            name={session.user.name}
            size="lg"
          />
          <div>
            <h2 className="text-xl font-bold text-arcade-text">
              {session.user.name || t.common.player}
            </h2>
            <p className="text-sm text-arcade-text/60">{session.user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <Settings size={20} className="text-arcade-cyan" />
          <h3 className="text-lg font-bold text-arcade-text">
            {t.myPage.profileSettings}
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 이니셜 설정 */}
          <div className="flex flex-col">
            <InitialsForm
              currentInitials={session.user.initials}
              onUpdate={handleUpdateInitials}
            />
          </div>

          {/* 캐릭터 선택 */}
          <div className="flex flex-col">
            <CharacterSelector
              currentCharacter={session.user.character as TCharacterType | null}
              onSelect={handleUpdateCharacter}
            />
          </div>
        </div>
      </div>

      <div
        className={cn(
          'p-6 rounded-lg',
          'bg-arcade-surface border border-arcade-border',
        )}>
        <GameHistory />
      </div>
    </div>
  );
}
