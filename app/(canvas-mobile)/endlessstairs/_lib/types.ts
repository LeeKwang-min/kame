// 플레이어 방향
export type TDirection = 'left' | 'right';

// 플레이어
export type TPlayer = {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: TDirection;
  isMoving: boolean;
  currentStairIndex: number;
};

// 계단
export type TStair = {
  x: number;
  y: number;
  width: number;
  height: number;
  direction: TDirection;
  passed: boolean;
};

// 애니메이션 상태
export type TAnimationState = 'idle' | 'walking' | 'falling';
