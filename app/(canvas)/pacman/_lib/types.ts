export type Point = { x: number; y: number };

export type Direction = 'up' | 'down' | 'left' | 'right' | 'none';

export type GhostName = 'blinky' | 'pinky' | 'inky' | 'clyde';

export type GhostMode = 'scatter' | 'chase' | 'frightened' | 'eaten';

export type GhostState = 'inHouse' | 'leavingHouse' | 'active';

export type Ghost = {
  name: GhostName;
  // 그리드 좌표 (정수)
  gridX: number;
  gridY: number;
  // 이전 그리드 좌표 (보간용)
  prevGridX: number;
  prevGridY: number;
  // 현재 방향
  direction: Direction;
  // 모드
  mode: GhostMode;
  // 이전 모드 (frightened에서 복귀용)
  prevMode: GhostMode;
  // 상태 (집 안, 탈출 중, 활동 중)
  state: GhostState;
  // Scatter 모드 타겟 (코너)
  scatterTarget: Point;
};

export type Pacman = {
  // 그리드 좌표 (정수)
  gridX: number;
  gridY: number;
  // 이전 그리드 좌표 (보간용)
  prevGridX: number;
  prevGridY: number;
  // 현재 방향
  direction: Direction;
  // 다음 방향 (코너에서 방향 전환용)
  nextDirection: Direction;
};

// 미로 셀 타입
export const CELL_TYPES = {
  EMPTY: 0,      // 빈 공간 (이동 가능, 점 없음)
  WALL: 1,       // 벽
  DOT: 2,        // Pac-Dot
  POWER: 3,      // Power Pellet
  GHOST_HOUSE: 4, // 유령 집 (유령만 통과 가능)
  GHOST_DOOR: 5,  // 유령 집 문
  TUNNEL: 6,     // 터널 (속도 감소)
} as const;

export type CellType = typeof CELL_TYPES[keyof typeof CELL_TYPES];

export type GameState = {
  pacman: Pacman;
  ghosts: Ghost[];
  maze: number[][];
  score: number;
  lives: number;
  level: number;
  dotsRemaining: number;
  totalDots: number;
  // 모드 관련
  currentMode: 'scatter' | 'chase';
  modeTimer: number;
  modeIndex: number;
  // Frightened 관련
  frightenedTimer: number;
  ghostsEatenCount: number; // 현재 frightened 동안 먹은 유령 수
  // 게임 상태
  isStarted: boolean;
  isGameOver: boolean;
  isPaused: boolean;
  isDying: boolean;
  deathAnimTimer: number;
  // 레벨 클리어
  isLevelClear: boolean;
  levelClearTimer: number;
};
