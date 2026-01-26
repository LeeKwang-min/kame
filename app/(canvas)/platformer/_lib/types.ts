// 플레이어
export type TPlayer = {
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number; // 수평 속도
  vy: number; // 수직 속도
  isGrounded: boolean; // 바닥에 있는지
  facingRight: boolean; // 바라보는 방향
};

// 타일 타입 (맵 구성요소)
export type TTileType =
  | 0  // 빈 공간 (공기)
  | 1  // 일반 벽/바닥
  | 2  // 플레이어 시작 위치
  | 3; // 탈출구 (골)

// 탈출구
export type TGoal = {
  x: number;
  y: number;
  width: number;
  height: number;
};