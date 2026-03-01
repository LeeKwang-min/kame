import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'solitaire',
  title: '솔리테어',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'selectable',
};

// Canvas
export const CANVAS_WIDTH = 620;
export const CANVAS_HEIGHT = 900;

// Card
export const CARD_WIDTH = 70;
export const CARD_HEIGHT = 100;
export const CARD_GAP = 8;
export const CARD_OVERLAP_Y = 25;
export const CARD_OVERLAP_FACE_Y = 35;
export const CARD_RADIUS = 6;

// Layout
export const TOP_ROW_Y = 20;
export const TABLEAU_Y = 150;
export const PILE_START_X = 15;

// Scoring
export const BASE_SCORE = 10000;
export const PENALTY_PER_SEC = 2;

// Draw mode
export type TDrawMode = 1 | 3;
export const DEFAULT_DRAW_MODE: TDrawMode = 1;

// Colors
export const TABLE_COLOR = '#1a472a';
export const CARD_BACK_COLOR = '#1a3a5c';
export const CARD_BACK_PATTERN_COLOR = '#245080';
export const CARD_FRONT_COLOR = '#ffffff';
export const CARD_BORDER_COLOR = '#cccccc';
export const RED_SUIT_COLOR = '#dc2626';
export const BLACK_SUIT_COLOR = '#1a1a1a';
export const HIGHLIGHT_COLOR = '#fbbf24';
export const EMPTY_PILE_COLOR = 'rgba(255,255,255,0.1)';
