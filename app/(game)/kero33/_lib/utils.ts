export const MAP_SIZE = 3;

export const PLAYER_DIR = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
} as const;

export const PLAYER_DIR_KEYS = Object.keys(
  PLAYER_DIR
) as (keyof typeof PLAYER_DIR)[];

export const getPlayerDir = (key: keyof typeof PLAYER_DIR) => {
  return PLAYER_DIR[key as keyof typeof PLAYER_DIR];
};
