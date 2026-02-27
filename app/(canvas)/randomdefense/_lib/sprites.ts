import { TArchetype } from './types';

// ─── 10×10 Pixel Art Grids ───
// 0 = transparent, 1 = outline, 2 = body, 3 = accent, 4 = weapon/detail

const SPRITE_GRIDS: Record<TArchetype, number[][]> = {
  // Laser Drone — Sleek aerodynamic shape with a central eye/emitter
  shooter: [
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
    [0, 1, 1, 2, 4, 4, 2, 1, 1, 0],
    [1, 2, 2, 2, 4, 4, 2, 2, 2, 1],
    [1, 3, 3, 2, 2, 2, 2, 3, 3, 1],
    [0, 1, 1, 2, 2, 2, 2, 1, 1, 0],
    [0, 0, 0, 1, 3, 3, 1, 0, 0, 0],
    [0, 0, 1, 4, 0, 0, 4, 1, 0, 0],
    [0, 1, 4, 0, 0, 0, 0, 4, 1, 0],
    [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
  ],
  // Plasma Mortar — Heavy octagonal base with a large energy crater
  splash: [
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 4, 4, 4, 4, 1, 0, 0],
    [0, 1, 4, 3, 3, 3, 3, 4, 1, 0],
    [1, 4, 3, 2, 2, 2, 2, 3, 4, 1],
    [1, 4, 3, 2, 2, 2, 2, 3, 4, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 3, 2, 2, 2, 2, 2, 2, 3, 1],
    [0, 1, 2, 2, 2, 2, 2, 2, 1, 0],
    [0, 1, 1, 2, 2, 2, 2, 1, 1, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
  ],
  // Cryo Core — Floating central sphere held by four corner emitters
  slow: [
    [1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
    [1, 4, 1, 0, 0, 0, 0, 1, 4, 1],
    [0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
    [0, 0, 1, 2, 3, 3, 2, 1, 0, 0],
    [0, 0, 1, 2, 3, 3, 2, 1, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
    [0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
    [1, 4, 1, 0, 0, 0, 0, 1, 4, 1],
    [1, 1, 0, 0, 0, 0, 0, 0, 1, 1],
  ],
  // Signal Relay — Tall spire with rotating signal rings
  buffer: [
    [0, 0, 0, 0, 4, 4, 0, 0, 0, 0],
    [0, 0, 0, 1, 4, 4, 1, 0, 0, 0],
    [0, 0, 1, 3, 3, 3, 3, 1, 0, 0],
    [0, 1, 2, 1, 1, 1, 1, 2, 1, 0],
    [1, 2, 2, 2, 4, 4, 2, 2, 2, 1],
    [0, 1, 2, 1, 1, 1, 1, 2, 1, 0],
    [0, 0, 1, 3, 3, 3, 3, 1, 0, 0],
    [0, 0, 0, 1, 4, 4, 1, 0, 0, 0],
    [0, 0, 1, 2, 2, 2, 2, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  ],
  // Malware Spreader — Dark hexagonal cluster with erratic pulses
  debuffer: [
    [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
    [0, 1, 4, 4, 1, 1, 4, 4, 1, 0],
    [1, 4, 2, 2, 4, 4, 2, 2, 4, 1],
    [1, 4, 2, 2, 1, 1, 2, 2, 4, 1],
    [0, 1, 4, 4, 3, 3, 4, 4, 1, 0],
    [0, 1, 4, 4, 3, 3, 4, 4, 1, 0],
    [1, 4, 2, 2, 1, 1, 2, 2, 4, 1],
    [1, 4, 2, 2, 4, 4, 2, 2, 4, 1],
    [0, 1, 4, 4, 1, 1, 4, 4, 1, 0],
    [0, 0, 1, 1, 0, 0, 1, 1, 0, 0],
  ],
};

// Weapon/detail accent colors per archetype (Cyber Neon)
export const WEAPON_COLORS: Record<TArchetype, string> = {
  shooter: '#00ffff', // cyan (laser drone)
  splash: '#f0abfc', // light purple (plasma mortar)
  slow: '#60a5fa', // blue (cryo core)
  buffer: '#4ade80', // green (signal relay)
  debuffer: '#f472b6', // pink (malware spreader)
};

// ─── Color Helpers ───

function parseHex(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(r: number, g: number, b: number): string {
  return (
    '#' +
    ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)
  );
}

function darken(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(
    Math.max(0, r - amount),
    Math.max(0, g - amount),
    Math.max(0, b - amount),
  );
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = parseHex(hex);
  return toHex(
    Math.min(255, r + amount),
    Math.min(255, g + amount),
    Math.min(255, b + amount),
  );
}

// ─── Palette Generation ───

function makePalette(tierColor: string, archetype: TArchetype): string[] {
  return [
    '', // 0: transparent (unused)
    darken(tierColor, 80), // 1: outline
    tierColor, // 2: body
    lighten(tierColor, 60), // 3: accent / highlight
    WEAPON_COLORS[archetype], // 4: weapon / detail
  ];
}

// ─── Sprite Cache (archetype × tierColor × size → offscreen canvas) ───

const spriteCache = new Map<string, HTMLCanvasElement>();

function getOrCreateSprite(
  archetype: TArchetype,
  tierColor: string,
  size: number,
): HTMLCanvasElement {
  const key = `${archetype}_${tierColor}_${size}`;
  const cached = spriteCache.get(key);
  if (cached) return cached;

  const grid = SPRITE_GRIDS[archetype];
  const palette = makePalette(tierColor, archetype);
  const gridSize = grid.length; // 10
  const pixelSize = size / gridSize;

  const offscreen = document.createElement('canvas');
  offscreen.width = size;
  offscreen.height = size;
  const offCtx = offscreen.getContext('2d')!;

  for (let row = 0; row < gridSize; row++) {
    for (let col = 0; col < gridSize; col++) {
      const idx = grid[row][col];
      if (idx === 0) continue;
      offCtx.fillStyle = palette[idx];
      offCtx.fillRect(
        Math.floor(col * pixelSize),
        Math.floor(row * pixelSize),
        Math.ceil(pixelSize),
        Math.ceil(pixelSize),
      );
    }
  }

  spriteCache.set(key, offscreen);
  return offscreen;
}

// ─── Public API ───

/** Draw a cached pixel-art sprite centered at (x, y). */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  archetype: TArchetype,
  tierColor: string,
  size: number,
): void {
  const rounded = Math.ceil(size);
  const sprite = getOrCreateSprite(archetype, tierColor, rounded);

  // Disable smoothing for crisp pixel art
  const prev = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  ctx.imageSmoothingEnabled = prev;
}

/** Clear the sprite cache (call on game reset if needed). */
export function clearSpriteCache(): void {
  spriteCache.clear();
}
