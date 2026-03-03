import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'superhexagon',
  title: 'Hexa Spin',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'landscape',
  category: 'action',
  difficulty: 'progressive',
};

// Canvas (가로형 — 기존 620x620 정사각형과 다름)
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 500;
export const CENTER_X = CANVAS_WIDTH / 2;
export const CENTER_Y = CANVAS_HEIGHT / 2;

// Hexagon
export const HEX_SIDES = 6;
export const HEX_RADIUS = 36;

// Player
export const PLAYER_DISTANCE = 52;
export const PLAYER_SIZE = 7;
export const PLAYER_SPEED = 4.8; // rad/s

// Walls
export const WALL_THICKNESS = 20;
export const WALL_SPAWN_DISTANCE = 420;

// Difficulty phases
export const PHASES = [
  { time: 0, wallSpeed: 120, rotSpeed: 0.4, palette: 'cyan' },
  { time: 10, wallSpeed: 160, rotSpeed: 0.6, palette: 'magenta' },
  { time: 20, wallSpeed: 200, rotSpeed: 0.8, palette: 'yellow' },
  { time: 30, wallSpeed: 250, rotSpeed: 1.0, palette: 'green' },
  { time: 45, wallSpeed: 300, rotSpeed: 1.2, palette: 'red' },
] as const;

// Color palettes (네온 스타일)
export const PALETTES: Record<
  string,
  { bg1: string; bg2: string; wall1: string; wall2: string; hex: string; player: string }
> = {
  cyan: { bg1: '#0a1628', bg2: '#0d2040', wall1: '#00e5ff', wall2: '#0097a7', hex: '#00bcd4', player: '#ffffff' },
  magenta: { bg1: '#1a0a28', bg2: '#2d0d40', wall1: '#ff4081', wall2: '#c51162', hex: '#e91e63', player: '#ffffff' },
  yellow: { bg1: '#1a1a0a', bg2: '#2d2d0d', wall1: '#ffea00', wall2: '#ffc400', hex: '#ffd600', player: '#ffffff' },
  green: { bg1: '#0a1a0a', bg2: '#0d2d0d', wall1: '#69f0ae', wall2: '#00c853', hex: '#00e676', player: '#ffffff' },
  red: { bg1: '#1a0a0a', bg2: '#2d0d0d', wall1: '#ff5252', wall2: '#d50000', hex: '#ff1744', player: '#ffffff' },
};

// Score
export const SCORE_PER_SEC = 100;

// Pattern spawn
export const PATTERN_GAP = 280; // 패턴 간 간격 (distance)
