import { TPlayer, TBullet, TEnemy } from './types';
import {
  ENEMY_ROWS,
  ENEMY_COLS,
  ENEMY_WIDTH,
  ENEMY_HEIGHT,
  ENEMY_PADDING,
  ENEMY_TOP_OFFSET,
  ENEMY_SIDE_OFFSET,
} from './config';

// ==================== 적 생성 ====================

/**
 * 적 배열 초기화
 * 5행 11열로 적을 배치
 */
export const createEnemies = (): TEnemy[] => {
  const enemies: TEnemy[] = [];

  for (let row = 0; row < ENEMY_ROWS; row++) {
    for (let col = 0; col < ENEMY_COLS; col++) {
      enemies.push({
        x: ENEMY_SIDE_OFFSET + col * (ENEMY_WIDTH + ENEMY_PADDING),
        y: ENEMY_TOP_OFFSET + row * (ENEMY_HEIGHT + ENEMY_PADDING),
        width: ENEMY_WIDTH,
        height: ENEMY_HEIGHT,
        alive: true,
        // 행에 따라 타입 결정 (0행=타입0, 1-2행=타입1, 3-4행=타입2)
        type: row === 0 ? 0 : row <= 2 ? 1 : 2,
      });
    }
  }

  return enemies;
};

// ==================== 적 이동 경계 계산 ====================

/**
 * 살아있는 적들의 좌우 경계 계산
 * 적이 벽에 닿았는지 확인할 때 사용
 */
export const getEnemyBounds = (
  enemies: TEnemy[],
): { left: number; right: number; bottom: number } => {
  let left = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    left = Math.min(left, enemy.x);
    right = Math.max(right, enemy.x + enemy.width);
    bottom = Math.max(bottom, enemy.y + enemy.height);
  }

  return { left, right, bottom };
};

// ==================== 랜덤 적 선택 ====================

/**
 * 살아있는 적 중 랜덤으로 하나 선택 (총알 발사용)
 * 각 열의 가장 아래에 있는 적만 발사 가능
 */
export const getShootingEnemy = (enemies: TEnemy[]): TEnemy | null => {
  // 각 열의 가장 아래에 있는 살아있는 적 찾기
  const bottomEnemies: TEnemy[] = [];

  for (let col = 0; col < ENEMY_COLS; col++) {
    // 해당 열의 적들을 아래에서부터 찾기
    for (let row = ENEMY_ROWS - 1; row >= 0; row--) {
      const index = row * ENEMY_COLS + col;
      const enemy = enemies[index];
      if (enemy && enemy.alive) {
        bottomEnemies.push(enemy);
        break; // 해당 열에서 가장 아래 적만
      }
    }
  }

  if (bottomEnemies.length === 0) return null;

  // 랜덤 선택
  return bottomEnemies[Math.floor(Math.random() * bottomEnemies.length)];
};
