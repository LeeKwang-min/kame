// 플레이어 요격 미사일
export type TPlayerMissile = {
  x: number; // 현재 위치
  y: number;
  targetX: number; // 목표 위치 (클릭한 곳)
  targetY: number;
  speed: number;
};

// 폭발
export type TExplosion = {
  x: number;
  y: number;
  radius: number; // 현재 반경
  maxRadius: number;
  phase: 'expanding' | 'shrinking'; // 커지는 중 / 줄어드는 중
};

// 적 미사일
export type TEnemyMissile = {
  x: number; // 현재 위치
  y: number;
  startX: number; // 시작 위치 (궤적 그리기용)
  startY: number;
  targetX: number; // 목표 위치 (도시)
  targetY: number;
  speed: number;
};

// 도시
export type TCity = {
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
};