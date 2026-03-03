export type TWall = {
  side: number; // 0~5 (hexagon face)
  distance: number; // distance from center (decreases over time)
  thickness: number; // wall thickness
};

export type TPattern = {
  walls: { side: number; offset: number }[]; // offset = relative distance stagger
};

export type TGameState = 'start' | 'loading' | 'playing' | 'paused' | 'gameover';
