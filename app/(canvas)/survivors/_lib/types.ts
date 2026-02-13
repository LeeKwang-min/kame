// ─── Basic ───
export type TVector2 = { x: number; y: number };
export type TDirection = 'up' | 'down' | 'left' | 'right';
export type TGameState =
  | 'start'
  | 'loading'
  | 'playing'
  | 'paused'
  | 'gameover'
  | 'levelup';

// ─── Camera ───
export type TCamera = { x: number; y: number };

// ─── Weapon IDs (10 base weapons) ───
export type TWeaponId =
  | 'magic_wand'
  | 'knife'
  | 'axe'
  | 'cross'
  | 'fire_wand'
  | 'garlic'
  | 'holy_water'
  | 'whip'
  | 'lightning_ring'
  | 'runetracer';

// ─── Evolved Weapon IDs (10 evolved forms) ───
export type TEvolvedWeaponId =
  | 'holy_wand'
  | 'thousand_edge'
  | 'death_spiral'
  | 'heaven_sword'
  | 'hellfire'
  | 'soul_eater'
  | 'blessed_water'
  | 'bloody_tear'
  | 'thunder_loop'
  | 'no_future';

// ─── Passive IDs (10 passive items) ───
export type TPassiveId =
  | 'spinach'
  | 'armor'
  | 'hollow_heart'
  | 'pummarola'
  | 'empty_tome'
  | 'bracer'
  | 'clover'
  | 'attractorb'
  | 'duplicator'
  | 'candelabrador';

// ─── Weapon Instance (player's equipped weapon) ───
export type TWeaponInstance = {
  id: TWeaponId | TEvolvedWeaponId;
  level: number;
  cooldownTimer: number;
  isEvolved: boolean;
};

// ─── Weapon Definition (static data) ───
export type TWeaponDef = {
  id: TWeaponId;
  name: string;
  description: string;
  baseCooldown: number;
  baseDamage: number;
  baseProjectiles: number;
  evolvesWith: TPassiveId;
  evolvesInto: TEvolvedWeaponId;
  evolvedName: string;
};

// ─── Passive Instance (equipped) ───
export type TPassiveInstance = {
  id: TPassiveId;
  level: number;
};

// ─── Passive Definition (static data) ───
export type TPassiveDef = {
  id: TPassiveId;
  name: string;
  description: string;
  effectPerLevel: number;
};

// ─── Player ───
export type TPlayer = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  pickupRange: number;
  direction: TDirection;
  animFrame: number;
  animTimer: number;
  isInvincible: boolean;
  invincibleTimer: number;
  weapons: TWeaponInstance[];
  passives: TPassiveInstance[];
  exp: number;
  level: number;
  expToNext: number;
  kills: number;
};

// ─── Projectile (pooled, has active flag) ───
export type TProjectile = {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  lifetime: number;
  maxLifetime: number;
  piercing: number; // 0=none, -1=infinite
  weaponId: TWeaponId | TEvolvedWeaponId;
  returning?: boolean;
  originX?: number;
  originY?: number;
  auraRadius?: number;
  zoneTimer?: number;
  bounces?: number;
};

// ─── Enemy Types ───
export type TEnemyType = 'bat' | 'zombie' | 'skeleton' | 'mummy' | 'witch' | 'boss';

// ─── Enemy (pooled) ───
export type TEnemy = {
  active: boolean;
  type: TEnemyType;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  exp: number;
  radius: number;
  animFrame: number;
  animTimer: number;
  hitFlashTimer: number;
  shootTimer?: number;
  shootCooldown?: number;
};

// ─── Enemy Definition (static data) ───
export type TEnemyDef = {
  type: TEnemyType;
  hp: number;
  speed: number;
  damage: number;
  exp: number;
  radius: number;
  color: string;
};

// ─── Gem (pooled) ───
export type TGem = {
  active: boolean;
  x: number;
  y: number;
  value: number;
  radius: number;
  magnetized: boolean;
};

// ─── Level-up Choice ───
export type TLevelUpChoice = {
  type: 'weapon' | 'passive';
  id: TWeaponId | TPassiveId;
  name: string;
  description: string;
  level: number;
};

// ─── Wave Event ───
export type TWaveEvent = {
  time: number;
  enemyType: TEnemyType;
  interval: number;
  hpMultiplier: number;
  speedMultiplier: number;
  count?: number; // optional: only for one-time spawns (e.g. boss)
};

// ─── Decoration ───
export type TDecoration = {
  x: number;
  y: number;
  type: 'tree' | 'rock' | 'bush';
};
