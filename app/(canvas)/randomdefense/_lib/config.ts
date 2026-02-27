// ─── Canvas ───
export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

// ─── Map Layout ───
export const MAP_WIDTH = 900;
export const MAP_HEIGHT = 800;
export const PANEL_X = MAP_WIDTH;
export const PANEL_WIDTH = CANVAS_WIDTH - MAP_WIDTH;

// ─── Grid (central stage) ───
export const CELL_SIZE = 50;
export const GRID_COLS = 13;
export const GRID_ROWS = 11;
export const GRID_OFFSET_X = 125;
export const GRID_OFFSET_Y = 150;

// ─── Stage (visual boundary for the grid) ───
export const STAGE_PADDING = 12;
export const STAGE_X = GRID_OFFSET_X - STAGE_PADDING;
export const STAGE_Y = GRID_OFFSET_Y - STAGE_PADDING;
export const STAGE_W = GRID_COLS * CELL_SIZE + STAGE_PADDING * 2;
export const STAGE_H = GRID_ROWS * CELL_SIZE + STAGE_PADDING * 2;

// ─── Rectangular Loop Path (enemies circle the stage) ───
const PATH_GAP = 18; // distance from stage edge to path center
export const PATH_ROAD_HALF_WIDTH = 22;
const RECT_LEFT = STAGE_X - PATH_GAP;
const RECT_RIGHT = STAGE_X + STAGE_W + PATH_GAP;
const RECT_TOP = STAGE_Y - PATH_GAP;
const RECT_BOTTOM = STAGE_Y + STAGE_H + PATH_GAP;
const POINTS_PER_SIDE = 6;

export const PATH_PIXELS: [number, number][] = (() => {
  const pts: [number, number][] = [];
  const n = POINTS_PER_SIDE;
  const w = RECT_RIGHT - RECT_LEFT;
  const h = RECT_BOTTOM - RECT_TOP;

  // Top side → right
  for (let i = 0; i < n; i++) pts.push([Math.round(RECT_LEFT + (w * i) / n), RECT_TOP]);
  // Right side → down
  for (let i = 0; i < n; i++) pts.push([RECT_RIGHT, Math.round(RECT_TOP + (h * i) / n)]);
  // Bottom side → left
  for (let i = 0; i < n; i++) pts.push([Math.round(RECT_RIGHT - (w * i) / n), RECT_BOTTOM]);
  // Left side → up
  for (let i = 0; i < n; i++) pts.push([RECT_LEFT, Math.round(RECT_BOTTOM - (h * i) / n)]);

  return pts;
})();

// Path cells (no-op: path is entirely outside the grid)
export function getPathCells(): Set<string> {
  return new Set<string>();
}

// ─── Unit Tiers & Summon ───
export const MAX_TIER = 6;
export const SUMMON_PROBABILITIES = [0.4, 0.3, 0.18, 0.09, 0.027, 0.003];

// ─── Economy ───
export const INITIAL_GOLD = 200;
export const SUMMON_BASE_COST = 50;
export const SUMMON_COST_INCREMENT = 5;
export const WAVE_BASE_REWARD = 30;
export const WAVE_REWARD_INCREMENT = 5;
export const KILL_GOLD_BASE = 2;
export const BOSS_KILL_GOLD = 25;
export const SELL_REFUND_RATE = 0.5;

// ─── Wave & Enemies ───
export const ENEMIES_PER_WAVE = 100;
export const MAX_ENEMIES_ON_SCREEN = 100;
export const WAVE_PREP_TIME = 10;
export const ENEMY_SPAWN_INTERVAL = 0.25;
export const BOSS_WAVE_INTERVAL = 5;

// ─── Enemy HP Scaling ───
export const HP_BASE = 54;
export const HP_SCALE_FACTOR = 0.28;
export const HP_SCALE_EXPONENT = 2.0;
export const ENEMY_SPEED_BASE = 50;

export const ENEMY_TYPE_MULT: Record<string, { hp: number; speed: number; gold: number }> = {
  normal: { hp: 1.0, speed: 1.0, gold: 1 },
  fast: { hp: 0.6, speed: 1.6, gold: 1 },
  tank: { hp: 2.5, speed: 0.7, gold: 2 },
  boss: { hp: 8.0, speed: 0.5, gold: 0 },
};

// ─── Projectile ───
export const PROJECTILE_SPEED = 400;

// ─── Effects ───
export const SUMMON_PARTICLE_COUNT = 15;
export const MERGE_PARTICLE_COUNT = 25;
export const KILL_PARTICLE_COUNT = 10;
export const BOSS_ENTRY_PARTICLE_COUNT = 40;
export const PARTICLE_LIFE = 0.8;
export const SCREEN_SHAKE_DURATION = 0.3;
export const SCREEN_SHAKE_INTENSITY = 5;

// ─── Tier Colors (Cyberpunk Neon) ───
export const TIER_COLORS: string[] = [
  '#94a3b8', // Tier 1 - Slate/Silver
  '#2dd4bf', // Tier 2 - Teal/Cyan
  '#22d3ee', // Tier 3 - Sky Blue
  '#c084fc', // Tier 4 - Purple
  '#f472b6', // Tier 5 - Pink/Neon
  '#ef4444', // Tier 6 - Red/Alert
];

export const TIER_BORDER_COLORS: string[] = [
  '#475569',
  '#0d9488',
  '#0891b2',
  '#9333ea',
  '#db2777',
  '#dc2626',
];

// ─── Wave Force Call ───
export const WAVE_PREP_TIME_ON_CLEAR = 3; // seconds after all enemies cleared
export const FORCE_WAVE_BONUS_RATIO = 0.5; // remaining time ratio * this = bonus gold ratio

// ─── Ground Zone (slow archetype) ───
export const GROUND_ZONE_BASE_DURATION = 3.0;
export const GROUND_ZONE_DURATION_PER_TIER = 0.5;

// ─── Splash Balance ───
export const SPLASH_MAX_TARGETS = 8;

// ─── Speed Control ───
export const SPEED_OPTIONS = [1, 2, 3] as const;

// ─── Archetype Symbols ───
export const ARCHETYPE_SYMBOLS: Record<string, string> = {
  shooter: '🎯',
  splash: '💥',
  slow: '❄️',
  buffer: '✨',
  debuffer: '☠️',
};
