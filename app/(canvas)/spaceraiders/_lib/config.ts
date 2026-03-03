// ==================== 캔버스 ====================
export const CANVAS_WIDTH = 480;
export const CANVAS_HEIGHT = 600;

// ==================== 플레이어 ====================
export const PLAYER_WIDTH = 50;
export const PLAYER_HEIGHT = 30;
export const PLAYER_SPEED = 300; // 픽셀/초
export const PLAYER_SHOOT_COOLDOWN = 0.3; // 발사 쿨타임 (초)

// ==================== 총알 ====================
export const BULLET_WIDTH = 4;
export const BULLET_HEIGHT = 15;
export const PLAYER_BULLET_SPEED = -500; // 음수 = 위로 이동
export const ENEMY_BULLET_SPEED = 250; // 양수 = 아래로 이동

// ==================== 적 ====================
export const ENEMY_ROWS = 5; // 적 행 수
export const ENEMY_COLS = 11; // 적 열 수
export const ENEMY_WIDTH = 30;
export const ENEMY_HEIGHT = 24;
export const ENEMY_PADDING = 10; // 적 간 간격
export const ENEMY_TOP_OFFSET = 60; // 상단 여백
export const ENEMY_SIDE_OFFSET = 30; // 좌우 여백
export const ENEMY_MOVE_SPEED = 15; // 기본 이동 속도
export const ENEMY_DROP_DISTANCE = 20; // 벽에 닿으면 내려오는 거리
export const ENEMY_SHOOT_INTERVAL = 1.5; // 적 발사 간격 (초)

// ==================== 점수 ====================
export const SCORE_PER_ENEMY = [30, 20, 10]; // 타입별 점수 (위에서부터)

// ==================== 색상 ====================
export const COLORS = {
  background: '#000000',
  player: '#00ff00',
  playerBullet: '#ffffff',
  enemyBullet: '#ff0000',
  enemy: ['#ff0000', '#ffff00', '#00ffff'], // 타입별 색상
  text: '#ffffff',
};
