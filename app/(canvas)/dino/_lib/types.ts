// 공룡 상태
export type TDino = {
  x: number;
  y: number;
  width: number;
  height: number;
  vy: number; // 수직 속도
  isJumping: boolean;
  isDucking: boolean; // 숙이기 (선택)
};

// 장애물 타입 -> 작은 선인장, 큰 선인장, 새
export type TObstacleType = 'cactus-small' | 'cactus-large' | 'bird';

// 장애물 정보
export type TObstacle = {
  x: number;
  y: number;
  width: number;
  height: number;
  type: TObstacleType;
};

// 바닥 타일 (무한 스크롤용)
export type TGround = {
  x: number;
};
