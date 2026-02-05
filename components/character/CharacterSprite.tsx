'use client';

import { useEffect, useState, useRef } from 'react';
import { cn } from '@/lib/utils';
import {
  CHARACTER_CONFIG,
  TCharacterType,
  TAnimationType,
  getCharacterSpritePath,
} from '@/lib/character/config';

interface IProps {
  type: TCharacterType;
  animation?: TAnimationType;
  size?: number; // 표시 크기 (px), className으로 크기 지정 시 생략
  className?: string;
  paused?: boolean;
}

function CharacterSprite({
  type,
  animation = 'idle',
  size,
  className,
  paused = false,
}: IProps) {
  const [frame, setFrame] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState(size || 64);

  const { spriteSize, cols, frameInterval, animations } = CHARACTER_CONFIG;
  const row = animations[animation];

  // 컨테이너 크기 감지
  useEffect(() => {
    if (size) {
      setContainerSize(size);
      return;
    }

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize(Math.min(rect.width, rect.height) || 64);
      }
    };

    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [size]);

  useEffect(() => {
    if (paused) return;

    const interval = setInterval(() => {
      setFrame((prev) => (prev + 1) % cols);
    }, frameInterval);

    return () => clearInterval(interval);
  }, [paused, cols, frameInterval]);

  // 스프라이트 시트에서 현재 프레임 위치 계산
  const offsetX = frame * spriteSize;
  const offsetY = row * spriteSize;

  // 스케일 계산 (원본 32px -> 표시 크기)
  const scale = containerSize / spriteSize;

  return (
    <div
      ref={containerRef}
      className={cn('overflow-hidden', className)}
      style={{
        ...(size && { width: size, height: size }),
        imageRendering: 'pixelated',
      }}>
      <div
        style={{
          width: spriteSize,
          height: spriteSize,
          backgroundImage: `url(${getCharacterSpritePath(type)})`,
          backgroundPosition: `-${offsetX}px -${offsetY}px`,
          backgroundSize: `${spriteSize * cols}px ${spriteSize * CHARACTER_CONFIG.rows}px`,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          imageRendering: 'pixelated',
        }}
      />
    </div>
  );
}

export default CharacterSprite;
