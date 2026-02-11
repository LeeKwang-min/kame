// ─── Archetypes ───
export type TArchetype = 'shooter' | 'splash' | 'slow' | 'buffer' | 'debuffer';

// ─── Unit Definition (immutable template) ───
export type TUnitDef = {
  id: string;
  name: string;
  tier: number; // 1-6
  archetype: TArchetype;
  damage: number;
  attackSpeed: number; // attacks per second
  range: number; // pixels
  color: string;
  symbol: string;
  // Archetype-specific
  splashRadius?: number;
  slowAmount?: number; // 0-1, multiplier
  slowRadius?: number; // aura radius (px)
  buffRadius?: number;
  buffMultiplier?: number; // damage multiplier for nearby allies
  debuffAmount?: number; // 0-1, damage amplification
  debuffRadius?: number; // aura radius (px)
};

// ─── Placed Unit (instance on the grid) ───
export type TPlacedUnit = {
  id: number;
  def: TUnitDef;
  gridCol: number;
  gridRow: number;
  x: number; // pixel center
  y: number;
  attackTimer: number;
  targetId: number | null;
  angle: number; // facing angle
  buffMultiplier: number; // applied buff from Buffer units
  attackFlash: number; // brief white flash timer on projectile fire
};

// ─── Enemy Types ───
export type TEnemyType = 'normal' | 'fast' | 'tank' | 'boss';

// ─── Enemy ───
export type TEnemy = {
  id: number;
  type: TEnemyType;
  hp: number;
  maxHp: number;
  speed: number; // pixels per second
  pathIndex: number; // current segment index
  pathProgress: number; // 0-1 within segment
  x: number;
  y: number;
  gold: number;
  // Status effects
  slowAmount: number; // 0 = no slow, 0.5 = 50% slow
  slowTimer: number;
  debuffAmount: number; // 0 = no debuff, 0.3 = 30% extra damage
  debuffTimer: number;
  hitFlash: number; // timer for white flash
};

// ─── Projectile ───
export type TProjectile = {
  id: number;
  x: number;
  y: number;
  targetId: number;
  damage: number;
  speed: number;
  color: string;
  // Archetype effects on hit
  splashRadius?: number;
  splashDamage?: number;
};

// ─── Particle ───
export type TParticle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
};

// ─── Floating Text ───
export type TFloatingText = {
  x: number;
  y: number;
  text: string;
  alpha: number;
  color: string;
  life: number;
  fontSize?: number;
};

// ─── Screen Shake ───
export type TScreenShake = {
  timer: number;
  intensity: number;
};

// ─── Drag State ───
export type TDragState = {
  unitId: number;
  originCol: number;
  originRow: number;
  mouseX: number;
  mouseY: number;
} | null;

// ─── Wave State ───
export type TWaveState = {
  wave: number;
  phase: 'prep' | 'spawning';
  prepTimer: number;
  spawnTimer: number;
  spawnQueue: TEnemyType[];
  spawnIndex: number;
};

// ─── Game State enum ───
export type TGameState = 'start' | 'loading' | 'playing' | 'paused' | 'gameover';
