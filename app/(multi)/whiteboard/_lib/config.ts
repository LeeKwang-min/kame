import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'whiteboard',
  title: '멀티 칠판',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'drag',
  orientation: 'landscape',
  category: 'multiplayer',
  difficulty: 'fixed',
};

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const COLORS = [
  '#000000', '#FF0000', '#0000FF', '#00AA00',
  '#FF8800', '#8800FF', '#FF00AA', '#FFFFFF',
] as const;

export const BRUSH_SIZES = [2, 4, 8, 16] as const;

export const MAX_PLAYERS = 8;
