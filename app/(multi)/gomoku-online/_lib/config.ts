export const GAME_TYPE = 'gomoku' as const;
export const MAX_PLAYERS = 2;
export const CANVAS_SIZE = 620;
export const BOARD_PADDING = 30;
export const CELL_SIZE = (CANVAS_SIZE - BOARD_PADDING * 2) / 14;
export const STONE_RADIUS = CELL_SIZE * 0.42;

export const COLORS = {
  BOARD_BG: '#DEB887',
  BOARD_GRID: '#4A3728',
  BLACK_STONE: '#1a1a1a',
  BLACK_STONE_HIGHLIGHT: '#333333',
  WHITE_STONE: '#f5f5f5',
  WHITE_STONE_SHADOW: '#cccccc',
  LAST_MOVE_DOT: '#e74c3c',
  FORBIDDEN_MARK: 'rgba(231, 76, 60, 0.5)',
  HOVER_PREVIEW: 'rgba(0, 0, 0, 0.3)',
  WIN_LINE: 'rgba(231, 76, 60, 0.8)',
  STAR_POINT: '#4A3728',
};
