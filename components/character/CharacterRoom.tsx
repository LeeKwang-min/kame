'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import {
  ROOM_BACKGROUND_PATH,
  TCharacterType,
  TAnimationType,
} from '@/lib/character/config';
import CharacterSprite from './CharacterSprite';
import Link from 'next/link';

interface IProps {
  characterType?: TCharacterType | null;
  animation?: TAnimationType;
  randomAnimation?: boolean; // 랜덤 애니메이션 활성화
  size?: number; // 전체 방 크기 (px), 없으면 부모 크기에 맞춤
  className?: string;
}

const ANIMATIONS: TAnimationType[] = ['idle', 'sitting', 'happy', 'sleep'];
const ANIMATION_DURATIONS: Record<TAnimationType, number> = {
  idle: 5000, // 5초
  sitting: 8000, // 8초
  happy: 3000, // 3초
  sleep: 10000, // 10초
};

function CharacterRoom({
  characterType,
  animation = 'idle',
  randomAnimation = true,
  size,
  className,
}: IProps) {
  const [currentAnimation, setCurrentAnimation] = useState<TAnimationType>(animation);

  useEffect(() => {
    if (!randomAnimation || !characterType) return;

    const changeAnimation = () => {
      // 랜덤 애니메이션 선택 (현재와 다른 것)
      const available = ANIMATIONS.filter((a) => a !== currentAnimation);
      const next = available[Math.floor(Math.random() * available.length)];
      setCurrentAnimation(next);
    };

    // 현재 애니메이션 지속 시간 후 변경
    const duration = ANIMATION_DURATIONS[currentAnimation];
    const timeout = setTimeout(changeAnimation, duration);

    return () => clearTimeout(timeout);
  }, [randomAnimation, characterType, currentAnimation]);
  // size가 지정되면 고정 크기, 아니면 부모에 맞춤
  const useFixedSize = typeof size === 'number';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg',
        'border-2 border-arcade-border',
        !useFixedSize && 'aspect-square w-full',
        className,
      )}
      style={{
        ...(useFixedSize && { width: size, height: size }),
        imageRendering: 'pixelated',
      }}>
      {/* 배경 이미지 */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `url(${ROOM_BACKGROUND_PATH})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          imageRendering: 'pixelated',
        }}
      />

      {/* 캐릭터 없을 때 플레이스홀더 - 클릭 시 마이페이지로 이동 */}
      {!characterType && (
        <Link
          href="/mypage"
          className="absolute inset-0 flex items-center justify-center group">
          <span
            className={cn(
              'text-lg font-bold text-white/70 bg-black/40 px-3 py-2 rounded-lg',
              'transition-all duration-200',
              'group-hover:bg-arcade-cyan/30 group-hover:text-white',
              'group-hover:scale-110',
            )}>
            ?
          </span>
        </Link>
      )}

      {/* 캐릭터 */}
      {characterType && (
        <div
          className="absolute"
          style={{
            left: '50%',
            bottom: 'calc(15% - 15px)',
            transform: 'translateX(-50%)',
            width: '40%',
            aspectRatio: '1',
          }}>
          <CharacterSprite
            type={characterType}
            animation={currentAnimation}
            className="w-full h-full"
          />
        </div>
      )}
    </div>
  );
}

export default CharacterRoom;
