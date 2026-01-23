// 4x4 그리드 (0은 빈 칸)
export type TGrid = number[][];

// 게임 상태
export type TGameState = 'playing' | 'won' | 'gameover';

// 애니메이션 중인 타일
export type TAnimatedTile = {
  value: number;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  progress: number; // 0 ~ 1
  merged?: boolean; // 병합된 타일인지
};

// 새로 생성된 타일 (팝업 애니메이션)
export type TNewTile = {
  row: number;
  col: number;
  value: number;
  scale: number; // 0 ~ 1
};
