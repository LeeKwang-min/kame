import { GAME_CONFIG } from './config';
import { GameState, MapState, Point, WaveDirection, WaveState } from './types';

// e.code 기반 (한글 입력 모드에서도 동작)
export const PLAYER_DIR = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
} as const;

export const PLAYER_DIR_CODES = Object.keys(
  PLAYER_DIR,
) as (keyof typeof PLAYER_DIR)[];

export const createInitialMap = (): MapState[][] =>
  Array.from({ length: GAME_CONFIG.MAP_SIZE }, () =>
    Array.from({ length: GAME_CONFIG.MAP_SIZE }, () => 'safe'),
  );

export const createInitialWaveState = (): WaveState => ({
  active: false,
  direction: 'right',
  currentStep: 0,
  totalSteps: GAME_CONFIG.MAP_SIZE,
  safeCells: [],
});

export const createInitialState = (): GameState => {
  const centerPos = {
    x: Math.floor(GAME_CONFIG.MAP_SIZE / 2),
    y: Math.floor(GAME_CONFIG.MAP_SIZE / 2),
  };

  return {
    phase: 'ready',
    lives: GAME_CONFIG.INITIAL_LIVES,
    score: 0,
    level: 1,
    playerPos: centerPos,
    renderPos: { ...centerPos },
    playerFacing: 'idle',
    playerAnimFrame: 0,
    playerLastMoveTime: 0,
    map: createInitialMap(),
    tick: 0,
    currentPatternName: null,
    invincibleUntil: 0,
    wave: createInitialWaveState(),
    patternQueue: [],
    patternQueueIndex: 0,
  };
};

// 선형 보간 (Linear Interpolation)
export const lerp = (start: number, end: number, t: number): number =>
  start + (end - start) * t;

// 부드러운 보간 (Ease-out)
export const lerpPoint = (
  current: Point,
  target: Point,
  speed: number,
): Point => ({
  x: lerp(current.x, target.x, speed),
  y: lerp(current.y, target.y, speed),
});

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const movePlayer = (pos: Point, dir: Point): Point => ({
  x: clamp(pos.x + dir.x, 0, GAME_CONFIG.MAP_SIZE - 1),
  y: clamp(pos.y + dir.y, 0, GAME_CONFIG.MAP_SIZE - 1),
});

// 대시: 해당 방향 끝까지 이동
export const dashPlayer = (pos: Point, dir: Point): Point => {
  if (dir.x < 0) return { x: 0, y: pos.y };
  if (dir.x > 0) return { x: GAME_CONFIG.MAP_SIZE - 1, y: pos.y };
  if (dir.y < 0) return { x: pos.x, y: 0 };
  if (dir.y > 0) return { x: pos.x, y: GAME_CONFIG.MAP_SIZE - 1 };
  return pos;
};

export const pickRandom = <T>(arr: T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];

// Fisher-Yates 셔플 알고리즘
export const shuffle = <T>(arr: T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// 인덱스 배열 생성 후 셔플
export const createShuffledIndices = (length: number): number[] => {
  const indices = Array.from({ length }, (_, i) => i);
  return shuffle(indices);
};

// Wave 방향에 따른 현재 스텝의 셀 반환
export const getWaveStepCells = (
  cells: Point[],
  direction: WaveDirection,
  step: number,
): Point[] => {
  const size = GAME_CONFIG.MAP_SIZE;

  return cells.filter(({ x, y }) => {
    switch (direction) {
      case 'right':
        return x === step;
      case 'left':
        return x === size - 1 - step;
      case 'down':
        return y === step;
      case 'up':
        return y === size - 1 - step;
    }
  });
};

// Wave 안전 지대 계산 (파도가 오는 반대쪽 끝)
export const getWaveSafeCells = (
  cells: Point[],
  direction: WaveDirection,
): Point[] => {
  const size = GAME_CONFIG.MAP_SIZE;

  return cells.filter(({ x, y }) => {
    switch (direction) {
      case 'right':
        return x === size - 1;
      case 'left':
        return x === 0;
      case 'down':
        return y === size - 1;
      case 'up':
        return y === 0;
    }
  });
};

// 포인트가 안전 지대에 있는지 확인
export const isInSafeCells = (point: Point, safeCells: Point[]): boolean => {
  return safeCells.some((safe) => safe.x === point.x && safe.y === point.y);
};

export const calculateTickInterval = (level: number): number => {
  const interval =
    GAME_CONFIG.TICK_INTERVAL - (level - 1) * GAME_CONFIG.TICK_SPEEDUP;
  return Math.max(interval, GAME_CONFIG.MIN_TICK_INTERVAL);
};

export const calculateLevel = (score: number): number => {
  return Math.floor(score / GAME_CONFIG.LEVEL_UP_SCORE) + 1;
};
