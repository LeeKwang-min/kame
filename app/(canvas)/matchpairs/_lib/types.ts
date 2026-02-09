export type TCard = {
  id: number;
  emoji: string;
  gridX: number; // 그리드 좌표 (0-3)
  gridY: number; // 그리드 좌표 (0-3)
  x: number; // 캔버스 실제 x 좌표
  y: number; // 캔버스 실제 y 좌표
  isFlipped: boolean;
  isMatched: boolean;
  flipProgress: number; // 0-1 (애니메이션용)
  isFlipping: boolean;
};

export type TGameState =
  | 'start'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'completed';
