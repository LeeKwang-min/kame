import { Ghost, Direction, Point, Pacman } from './types';
import {
  getAvailableDirections,
  distanceSquared,
  directionToDelta,
  GHOST_HOUSE_EXIT,
  isInGhostHouse,
} from './maze';

// 유령 AI: 각 유령의 Chase 모드 타겟 계산

/**
 * Blinky (빨강): 직접 추적
 * 팩맨의 현재 위치를 타겟으로 함
 */
export const getBlinkyTarget = (pacman: Pacman): Point => {
  return { x: pacman.gridX, y: pacman.gridY };
};

/**
 * Pinky (분홍): 예측 추적
 * 팩맨이 향하는 방향으로 4칸 앞을 타겟으로 함
 * (원본에서는 위쪽 방향일 때 버그로 왼쪽으로도 4칸 이동)
 */
export const getPinkyTarget = (pacman: Pacman): Point => {
  const delta = directionToDelta(pacman.direction);
  let targetX = pacman.gridX + delta.x * 4;
  let targetY = pacman.gridY + delta.y * 4;

  // 원본 버그 재현: 위쪽 방향일 때 왼쪽으로도 4칸
  if (pacman.direction === 'up') {
    targetX -= 4;
  }

  return { x: targetX, y: targetY };
};

/**
 * Inky (청록): 복합 타겟팅
 * 팩맨 앞 2칸 위치와 Blinky 사이의 벡터를 2배로 연장
 */
export const getInkyTarget = (pacman: Pacman, blinky: Ghost): Point => {
  const delta = directionToDelta(pacman.direction);

  // 팩맨 앞 2칸
  let pivotX = pacman.gridX + delta.x * 2;
  let pivotY = pacman.gridY + delta.y * 2;

  // 위쪽 방향 버그
  if (pacman.direction === 'up') {
    pivotX -= 2;
  }

  // Blinky에서 pivot까지의 벡터를 2배로 연장
  const vectorX = pivotX - blinky.gridX;
  const vectorY = pivotY - blinky.gridY;

  return {
    x: blinky.gridX + vectorX * 2,
    y: blinky.gridY + vectorY * 2,
  };
};

/**
 * Clyde (주황): 거리 기반 행동
 * 팩맨과 8칸 이상 떨어져 있으면 Blinky처럼 추적
 * 8칸 미만이면 자신의 Scatter 타겟(왼쪽 아래 코너)으로 도망
 */
export const getClydeTarget = (
  pacman: Pacman,
  clyde: Ghost,
  scatterTarget: Point
): Point => {
  const distSq = distanceSquared(
    { x: clyde.gridX, y: clyde.gridY },
    { x: pacman.gridX, y: pacman.gridY }
  );

  // 8칸 = 64 (거리 제곱)
  if (distSq >= 64) {
    // 팩맨 추적
    return { x: pacman.gridX, y: pacman.gridY };
  } else {
    // 도망 (Scatter 타겟)
    return scatterTarget;
  }
};

/**
 * 유령의 타겟을 기반으로 최적의 방향 결정
 * 가장 타겟에 가까워지는 방향 선택
 */
export const chooseDirection = (
  ghost: Ghost,
  target: Point,
  maze: number[][],
  isLeavingHouse: boolean = false,
  isEaten: boolean = false
): Direction => {
  const availableDirs = getAvailableDirections(
    maze,
    ghost.gridX,
    ghost.gridY,
    ghost.direction,
    true, // isGhost
    isLeavingHouse,
    isEaten
  );

  if (availableDirs.length === 0) {
    return ghost.direction;
  }

  if (availableDirs.length === 1) {
    return availableDirs[0];
  }

  // 각 방향으로 이동했을 때 타겟까지의 거리 계산
  let bestDir = availableDirs[0];
  let bestDist = Infinity;

  // 우선순위: up > left > down > right (동점일 때)
  const priority: Direction[] = ['up', 'left', 'down', 'right'];

  for (const dir of priority) {
    if (!availableDirs.includes(dir)) continue;

    const delta = directionToDelta(dir);
    const newX = ghost.gridX + delta.x;
    const newY = ghost.gridY + delta.y;
    const dist = distanceSquared({ x: newX, y: newY }, target);

    if (dist < bestDist) {
      bestDist = dist;
      bestDir = dir;
    }
  }

  return bestDir;
};

/**
 * Frightened 모드: 랜덤 방향 선택
 */
export const chooseFrightenedDirection = (
  ghost: Ghost,
  maze: number[][]
): Direction => {
  const availableDirs = getAvailableDirections(
    maze,
    ghost.gridX,
    ghost.gridY,
    ghost.direction,
    true, // isGhost
    false,
    false
  );

  if (availableDirs.length === 0) {
    return ghost.direction;
  }

  // 랜덤 선택
  const randomIndex = Math.floor(Math.random() * availableDirs.length);
  return availableDirs[randomIndex];
};

/**
 * 유령 집 탈출 로직
 * 집 중앙으로 이동 후 위로 나감
 */
export const getExitHouseDirection = (ghost: Ghost): Direction => {
  // 먼저 집 중앙(x=14)으로 이동
  if (ghost.gridX < 14) {
    return 'right';
  } else if (ghost.gridX > 14) {
    return 'left';
  }

  // 중앙이면 위로
  if (ghost.gridY > GHOST_HOUSE_EXIT.y) {
    return 'up';
  }

  return 'up';
};

/**
 * Eaten 상태: 유령 집으로 돌아가기
 */
export const getReturnToHouseTarget = (): Point => {
  return { x: 14, y: 14 }; // 유령 집 중앙
};

/**
 * 유령 집에 도착했는지 확인
 */
export const hasReachedHouse = (ghost: Ghost): boolean => {
  return ghost.gridX === 14 && ghost.gridY === 14;
};

/**
 * 메인 유령 AI 함수
 * 현재 상태에 따라 적절한 타겟과 방향을 결정
 */
export const updateGhostDirection = (
  ghost: Ghost,
  pacman: Pacman,
  ghosts: Ghost[],
  maze: number[][]
): Direction => {
  // 유령 집에서 나가는 중
  if (ghost.state === 'leavingHouse') {
    return getExitHouseDirection(ghost);
  }

  // Eaten 상태: 집으로 돌아감
  if (ghost.mode === 'eaten') {
    const target = getReturnToHouseTarget();
    return chooseDirection(ghost, target, maze, false, true);
  }

  // Frightened 상태: 랜덤 이동
  if (ghost.mode === 'frightened') {
    return chooseFrightenedDirection(ghost, maze);
  }

  // 타겟 결정
  let target: Point;

  if (ghost.mode === 'scatter') {
    // Scatter 모드: 각자 코너로
    target = ghost.scatterTarget;
  } else {
    // Chase 모드: 각 유령의 AI에 따라
    const blinky = ghosts.find(g => g.name === 'blinky')!;

    switch (ghost.name) {
      case 'blinky':
        target = getBlinkyTarget(pacman);
        break;
      case 'pinky':
        target = getPinkyTarget(pacman);
        break;
      case 'inky':
        target = getInkyTarget(pacman, blinky);
        break;
      case 'clyde':
        target = getClydeTarget(pacman, ghost, ghost.scatterTarget);
        break;
      default:
        target = getBlinkyTarget(pacman);
    }
  }

  return chooseDirection(ghost, target, maze);
};
