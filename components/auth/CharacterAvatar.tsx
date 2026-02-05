'use client';

import { cn } from '@/lib/utils';
import { User } from 'lucide-react';
import Image from 'next/image';

interface IProps {
  characterId?: string;
  image?: string | null;
  name?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
};

const ICON_SIZE_MAP = {
  sm: 16,
  md: 24,
  lg: 32,
};

function CharacterAvatar({
  characterId,
  image,
  name,
  size = 'md',
  className,
}: IProps) {
  const sizeClass = SIZE_MAP[size];
  const iconSize = ICON_SIZE_MAP[size];

  if (characterId) {
    return (
      <div
        className={cn(
          sizeClass,
          'relative rounded-full overflow-hidden',
          'border-2 border-arcade-cyan',
          'shadow-[0_0_10px_rgba(0,255,245,0.3)]',
          className,
        )}>
        <Image
          src={`/characters/${characterId}.png`}
          alt={name || 'Character'}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  if (image) {
    return (
      <div
        className={cn(
          sizeClass,
          'relative rounded-full overflow-hidden',
          'border-2 border-arcade-cyan',
          'shadow-[0_0_10px_rgba(0,255,245,0.3)]',
          className,
        )}>
        <Image
          src={image}
          alt={name || 'User'}
          fill
          className="object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        sizeClass,
        'flex items-center justify-center',
        'rounded-full',
        'bg-arcade-surface',
        'border-2 border-arcade-cyan',
        'shadow-[0_0_10px_rgba(0,255,245,0.3)]',
        className,
      )}>
      <User size={iconSize} className="text-arcade-cyan" />
    </div>
  );
}

export default CharacterAvatar;
