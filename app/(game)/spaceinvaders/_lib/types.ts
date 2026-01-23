// 플레이어 우주선 타입
export type TPlayer = {
  x: number; // x 좌표 (캔버스 내 위치)
  y: number; // y 좌표
  width: number; // 우주선 너비
  height: number; // 우주선 높이
  speed: number; // 이동 속도 (픽셀/초)
};

// 총알 타입 (플레이어와 적 모두 사용)
export type TBullet = {
  x: number; // 총알 중심 x
  y: number; // 총알 중심 y
  width: number;
  height: number;
  speed: number; // 양수면 아래로, 음수면 위로
};

// 적(인베이더) 타입
export type TEnemy = {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean; // 살아있는지 여부
  type: number; // 적 종류 (0, 1, 2 - 모양/점수 다르게)
};

// 게임 상태 타입
export type TGameState = 'ready' | 'playing' | 'gameover' | 'won';
