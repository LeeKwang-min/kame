'use client';

import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import CharacterAvatar from './CharacterAvatar';
import CharacterRoom from '@/components/character/CharacterRoom';
import { LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLocale } from '@/provider/LocaleProvider';
import { TCharacterType } from '@/lib/character/config';

interface IProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    initials?: string | null;
    character?: string | null;
  };
}

function UserProfile({ user }: IProps) {
  const { t } = useLocale();

  const handleLogout = () => {
    signOut({ callbackUrl: '/' });
  };

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 프로필 정보 - 상단에 작게 */}
      <div className="flex items-center gap-2">
        <CharacterAvatar image={user.image} name={user.name} size="sm" />
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="text-sm font-medium text-arcade-text truncate">
            {user.name || t.common.player}
          </span>
          {user.initials ? (
            <span className="text-xs text-arcade-cyan font-mono">
              ({user.initials})
            </span>
          ) : (
            <span className="text-xs text-arcade-yellow">
              {t.auth.initialsNotSet}
            </span>
          )}
        </div>
      </div>

      {/* 캐릭터 방 */}
      <CharacterRoom
        characterType={user.character as TCharacterType | null}
        animation="idle"
        className="w-full"
      />

      {/* 버튼들 - 작은 크기 */}
      <div className="flex gap-2 w-full">
        <Link href="/mypage" className="flex-1">
          <Button
            variant="outline"
            size="sm"
            className={cn(
              'w-full h-8 text-xs gap-1.5',
              'bg-arcade-surface/50 border-arcade-border',
              'hover:bg-arcade-surface hover:border-arcade-cyan/50',
              'text-arcade-text',
            )}>
            <User size={14} />
            {t.common.myPage}
          </Button>
        </Link>

        <Button
          variant="outline"
          size="sm"
          onClick={handleLogout}
          className={cn(
            'flex-1 h-8 text-xs gap-1.5',
            'bg-arcade-surface/50 border-arcade-border',
            'hover:bg-red-900/30 hover:border-red-500/50',
            'text-arcade-text hover:text-red-400',
          )}>
          <LogOut size={14} />
          {t.common.logout}
        </Button>
      </div>
    </div>
  );
}

export default UserProfile;
