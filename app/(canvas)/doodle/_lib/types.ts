// 플레이어 (두들러)
export type TPlayer = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number; // 좌우 속도
  vy: number; // 상하 속도
};

// 플랫폼 종류
export type TPlatformType = 'normal' | 'moving' | 'breaking' | 'spring';

// 플랫폼
export type TPlatform = {
  x: number;
  y: number;
  width: number;
  height: number;
  type: TPlatformType;

  // moving 플랫폼용
  vx?: number;
  minX?: number;
  maxX?: number;

  // breaking 플랫폼용
  isBroken?: boolean;
};
