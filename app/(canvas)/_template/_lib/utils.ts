// ==================== Game Utilities ====================
// TODO: 게임에 필요한 유틸리티 함수들을 정의하세요

/**
 * 두 원 사이의 충돌 검사
 */
export const circleCircleCollide = (
  x1: number,
  y1: number,
  r1: number,
  x2: number,
  y2: number,
  r2: number,
): boolean => {
  const dx = x1 - x2;
  const dy = y1 - y2;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return dist < r1 + r2;
};

/**
 * 사각형과 원 사이의 충돌 검사
 */
export const rectCircleCollide = (
  rx: number,
  ry: number,
  rw: number,
  rh: number,
  cx: number,
  cy: number,
  cr: number,
): boolean => {
  const closestX = Math.max(rx, Math.min(cx, rx + rw));
  const closestY = Math.max(ry, Math.min(cy, ry + rh));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < cr * cr;
};

/**
 * 두 사각형 사이의 충돌 검사
 */
export const rectRectCollide = (
  x1: number,
  y1: number,
  w1: number,
  h1: number,
  x2: number,
  y2: number,
  w2: number,
  h2: number,
): boolean => {
  return x1 < x2 + w2 && x1 + w1 > x2 && y1 < y2 + h2 && y1 + h1 > y2;
};

/**
 * 범위 내 랜덤 값 생성
 */
export const randomRange = (min: number, max: number): number => {
  return min + Math.random() * (max - min);
};

/**
 * 값을 범위 내로 제한
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};
