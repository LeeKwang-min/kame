// 그리드 크기
export const GRID_SIZE = 4;

// 셀 크기
export const CELL_SIZE = 140;
export const CELL_GAP = 12;
export const CELL_RADIUS = 8;

// 시작 타일 개수
export const INITIAL_TILES = 2;

// 승리 조건
export const WIN_VALUE = 2048;

// 타일 색상 (값에 따라)
export const TILE_COLORS: Record<number, { bg: string; text: string }> = {
  0: { bg: '#cdc1b4', text: '#cdc1b4' },
  2: { bg: '#eee4da', text: '#776e65' },
  4: { bg: '#ede0c8', text: '#776e65' },
  8: { bg: '#f2b179', text: '#f9f6f2' },
  16: { bg: '#f59563', text: '#f9f6f2' },
  32: { bg: '#f67c5f', text: '#f9f6f2' },
  64: { bg: '#f65e3b', text: '#f9f6f2' },
  128: { bg: '#edcf72', text: '#f9f6f2' },
  256: { bg: '#edcc61', text: '#f9f6f2' },
  512: { bg: '#edc850', text: '#f9f6f2' },
  1024: { bg: '#edc53f', text: '#f9f6f2' },
  2048: { bg: '#edc22e', text: '#f9f6f2' },
};

// 배경 색상
export const BG_COLOR = '#bbada0';
export const BOARD_COLOR = '#bbada0';

// 애니메이션 설정
export const ANIMATION_DURATION = 100; // 이동 애니메이션 (ms)
export const POPUP_DURATION = 100; // 새 타일 팝업 (ms)
