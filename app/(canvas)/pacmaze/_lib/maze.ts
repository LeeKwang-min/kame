import { CELL_TYPES, Point, Direction, CellType } from './types';
import { MAZE_COLS, MAZE_ROWS } from './config';

const W = CELL_TYPES.WALL;
const E = CELL_TYPES.EMPTY;
const D = CELL_TYPES.DOT;
const P = CELL_TYPES.POWER;
const H = CELL_TYPES.GHOST_HOUSE;
const G = CELL_TYPES.GHOST_DOOR;
const T = CELL_TYPES.TUNNEL;

// 클래식 팩맨 미로 (28x31)
// 참고: 실제 팩맨 미로를 기반으로 함
export const INITIAL_MAZE: number[][] = [
  // Row 0
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  // Row 1
  [W,D,D,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 2
  [W,D,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,D,W],
  // Row 3
  [W,P,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,P,W],
  // Row 4
  [W,D,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,D,W],
  // Row 5
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 6
  [W,D,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,D,W],
  // Row 7
  [W,D,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,D,W],
  // Row 8
  [W,D,D,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,D,D,W],
  // Row 9
  [W,W,W,W,W,W,D,W,W,W,W,W,E,W,W,E,W,W,W,W,W,D,W,W,W,W,W,W],
  // Row 10
  [E,E,E,E,E,W,D,W,W,W,W,W,E,W,W,E,W,W,W,W,W,D,W,E,E,E,E,E],
  // Row 11
  [E,E,E,E,E,W,D,W,W,E,E,E,E,E,E,E,E,E,E,W,W,D,W,E,E,E,E,E],
  // Row 12
  [E,E,E,E,E,W,D,W,W,E,W,W,W,G,G,W,W,W,E,W,W,D,W,E,E,E,E,E],
  // Row 13
  [W,W,W,W,W,W,D,W,W,E,W,H,H,H,H,H,H,W,E,W,W,D,W,W,W,W,W,W],
  // Row 14
  [T,E,E,E,E,E,D,E,E,E,W,H,H,H,H,H,H,W,E,E,E,D,E,E,E,E,E,T],
  // Row 15
  [W,W,W,W,W,W,D,W,W,E,W,H,H,H,H,H,H,W,E,W,W,D,W,W,W,W,W,W],
  // Row 16
  [E,E,E,E,E,W,D,W,W,E,W,W,W,W,W,W,W,W,E,W,W,D,W,E,E,E,E,E],
  // Row 17
  [E,E,E,E,E,W,D,W,W,E,E,E,E,E,E,E,E,E,E,W,W,D,W,E,E,E,E,E],
  // Row 18
  [E,E,E,E,E,W,D,W,W,E,W,W,W,W,W,W,W,W,E,W,W,D,W,E,E,E,E,E],
  // Row 19
  [W,W,W,W,W,W,D,W,W,E,W,W,W,W,W,W,W,W,E,W,W,D,W,W,W,W,W,W],
  // Row 20
  [W,D,D,D,D,D,D,D,D,D,D,D,D,W,W,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 21
  [W,D,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,D,W],
  // Row 22
  [W,D,W,W,W,W,D,W,W,W,W,W,D,W,W,D,W,W,W,W,W,D,W,W,W,W,D,W],
  // Row 23
  [W,P,D,D,W,W,D,D,D,D,D,D,D,E,E,D,D,D,D,D,D,D,W,W,D,D,P,W],
  // Row 24
  [W,W,W,D,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,D,W,W,W],
  // Row 25
  [W,W,W,D,W,W,D,W,W,D,W,W,W,W,W,W,W,W,D,W,W,D,W,W,D,W,W,W],
  // Row 26
  [W,D,D,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,W,W,D,D,D,D,D,D,W],
  // Row 27
  [W,D,W,W,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,W,W,D,W],
  // Row 28
  [W,D,W,W,W,W,W,W,W,W,W,W,D,W,W,D,W,W,W,W,W,W,W,W,W,W,D,W],
  // Row 29
  [W,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,D,W],
  // Row 30
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

// 팩맨 시작 위치 (Row 23, Col 13-14 사이)
export const PACMAN_START: Point = { x: 14, y: 23 };

// 유령 시작 위치 (유령 집 안)
export const GHOST_START_POSITIONS = {
  blinky: { x: 14, y: 11 }, // 집 바로 위 (바로 시작)
  pinky: { x: 14, y: 14 },  // 집 중앙
  inky: { x: 12, y: 14 },   // 집 왼쪽
  clyde: { x: 16, y: 14 },  // 집 오른쪽
};

// 유령 Scatter 모드 타겟 (코너)
export const GHOST_SCATTER_TARGETS = {
  blinky: { x: 25, y: 0 },  // 오른쪽 위
  pinky: { x: 2, y: 0 },    // 왼쪽 위
  inky: { x: 27, y: 30 },   // 오른쪽 아래
  clyde: { x: 0, y: 30 },   // 왼쪽 아래
};

// 유령 집 출구
export const GHOST_HOUSE_EXIT: Point = { x: 14, y: 11 };

// 터널 위치
export const TUNNEL_LEFT: Point = { x: 0, y: 14 };
export const TUNNEL_RIGHT: Point = { x: 27, y: 14 };

// 미로 유틸리티 함수

// 미로 복제 (게임 시작/레벨 클리어 시)
export const cloneMaze = (): number[][] => {
  return INITIAL_MAZE.map(row => [...row]);
};

// 셀 타입 확인
export const getCellType = (maze: number[][], x: number, y: number): CellType => {
  if (x < 0 || x >= MAZE_COLS || y < 0 || y >= MAZE_ROWS) {
    return CELL_TYPES.EMPTY; // 터널 통과용
  }
  return maze[y][x] as CellType;
};

// 이동 가능 여부 확인 (팩맨용)
export const canPacmanMove = (maze: number[][], x: number, y: number): boolean => {
  const cellType = getCellType(maze, x, y);
  return cellType !== CELL_TYPES.WALL &&
         cellType !== CELL_TYPES.GHOST_HOUSE &&
         cellType !== CELL_TYPES.GHOST_DOOR;
};

// 이동 가능 여부 확인 (유령용)
export const canGhostMove = (
  maze: number[][],
  x: number,
  y: number,
  isLeavingHouse: boolean,
  isEaten: boolean
): boolean => {
  const cellType = getCellType(maze, x, y);

  if (cellType === CELL_TYPES.WALL) return false;

  // 유령 문은 집을 나갈 때나 먹힌 상태로 돌아갈 때만 통과 가능
  if (cellType === CELL_TYPES.GHOST_DOOR) {
    return isLeavingHouse || isEaten;
  }

  // 유령 집은 먹힌 상태로 돌아갈 때만 통과 가능
  if (cellType === CELL_TYPES.GHOST_HOUSE) {
    return isEaten;
  }

  return true;
};

// 터널 처리
export const handleTunnel = (x: number, y: number): Point => {
  if (x < 0) {
    return { x: MAZE_COLS - 1, y };
  }
  if (x >= MAZE_COLS) {
    return { x: 0, y };
  }
  return { x, y };
};

// 터널 내부인지 확인
export const isInTunnel = (x: number, y: number): boolean => {
  return y === 14 && (x <= 5 || x >= 22);
};

// 유령 집 내부인지 확인
export const isInGhostHouse = (x: number, y: number): boolean => {
  return y >= 13 && y <= 15 && x >= 11 && x <= 16;
};

// 특정 위치에서 이동 가능한 방향들 반환
export const getAvailableDirections = (
  maze: number[][],
  x: number,
  y: number,
  currentDir: Direction,
  isGhost: boolean = false,
  isLeavingHouse: boolean = false,
  isEaten: boolean = false
): Direction[] => {
  const directions: Direction[] = ['up', 'down', 'left', 'right'];
  const available: Direction[] = [];

  // 반대 방향
  const opposite: Record<Direction, Direction> = {
    up: 'down',
    down: 'up',
    left: 'right',
    right: 'left',
    none: 'none',
  };

  const deltas: Record<Direction, Point> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    none: { x: 0, y: 0 },
  };

  for (const dir of directions) {
    // 유령은 반대 방향으로 돌아갈 수 없음 (특별한 경우 제외)
    if (isGhost && dir === opposite[currentDir]) continue;

    const delta = deltas[dir];
    const newX = x + delta.x;
    const newY = y + delta.y;

    const canMove = isGhost
      ? canGhostMove(maze, newX, newY, isLeavingHouse, isEaten)
      : canPacmanMove(maze, newX, newY);

    if (canMove) {
      available.push(dir);
    }
  }

  return available;
};

// 두 점 사이의 거리 (맨해튼 거리)
export const manhattanDistance = (p1: Point, p2: Point): number => {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y);
};

// 두 점 사이의 거리 (유클리드 거리 제곱)
export const distanceSquared = (p1: Point, p2: Point): number => {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return dx * dx + dy * dy;
};

// 방향을 델타로 변환
export const directionToDelta = (dir: Direction): Point => {
  const deltas: Record<Direction, Point> = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
    none: { x: 0, y: 0 },
  };
  return deltas[dir];
};

// 총 점(Dot + Power Pellet) 수 계산
export const countDots = (maze: number[][]): number => {
  let count = 0;
  for (let y = 0; y < MAZE_ROWS; y++) {
    for (let x = 0; x < MAZE_COLS; x++) {
      if (maze[y][x] === CELL_TYPES.DOT || maze[y][x] === CELL_TYPES.POWER) {
        count++;
      }
    }
  }
  return count;
};
