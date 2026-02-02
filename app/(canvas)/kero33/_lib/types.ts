export type Point = { x: number; y: number };

export type MapState = 'safe' | 'warn' | 'danger';

export type GamePhase = 'ready' | 'playing' | 'gameover';

export type WaveDirection = 'left' | 'right' | 'up' | 'down';

export type PlayerFacing = 'left' | 'right' | 'idle';

export type WaveState = {
  active: boolean;
  direction: WaveDirection;
  currentStep: number;
  totalSteps: number;
  safeCells: Point[]; // 안전 지대 좌표
};

export type GameState = {
  phase: GamePhase;
  lives: number;
  score: number;
  level: number;
  playerPos: Point;
  renderPos: Point;
  playerFacing: PlayerFacing; // 플레이어가 바라보는 방향
  playerAnimFrame: number; // 현재 애니메이션 프레임 (0 또는 1)
  playerLastMoveTime: number; // 마지막 이동 시간
  map: MapState[][];
  tick: number;
  currentPatternName: string | null;
  invincibleUntil: number;
  wave: WaveState;
  patternQueue: number[]; // 셔플된 패턴 인덱스 큐
  patternQueueIndex: number; // 현재 큐 인덱스
};
