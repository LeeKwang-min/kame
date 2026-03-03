import { TFruitType } from './types';

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 700;

export const FRUIT_MIN_RADIUS = 25;
export const FRUIT_MAX_RADIUS = 40;

export const GRAVITY = 800;

export const FRUIT_VY_MIN = -750;
export const FRUIT_VY_MAX = -550;
export const FRUIT_VX_MIN = -120;
export const FRUIT_VX_MAX = 120;

export const SPAWN_INTERVAL_START = 1.2;
export const SPAWN_INTERVAL_MIN = 0.4;

export const SPAWN_COUNT_MIN = 1;
export const SPAWN_COUNT_MAX = 3;

export const BOMB_CHANCE = 0.15;
export const CRITICAL_CHANCE = 0.08;
export const DRAGONFRUIT_CHANCE = 0.05;

export const DRAGONFRUIT_SCORE = 5;
export const CRITICAL_BONUS = 10;
export const COMBO_MIN_COUNT = 3;

export const MAX_LIVES = 3;

export const SLICE_TRAIL_DURATION = 80;
export const COMBO_WINDOW_MS = 300;

export const PARTICLE_COUNT = 8;
export const PARTICLE_LIFE = 0.6;

export const FRUIT_COLORS: Record<
  TFruitType,
  { outer: string; inner: string; seed: string; highlight: string }
> = {
  watermelon: {
    outer: '#2d8a4e',
    inner: '#e74c3c',
    seed: '#1a1a1a',
    highlight: '#4ebd6b',
  },
  orange: {
    outer: '#f39c12',
    inner: '#ffc048',
    seed: '#e67e22',
    highlight: '#ffe0a0',
  },
  apple: {
    outer: '#e74c3c',
    inner: '#ffeaa7',
    seed: '#7b3f00',
    highlight: '#ff7675',
  },
  banana: {
    outer: '#f1c40f',
    inner: '#fff9c4',
    seed: '#d4a017',
    highlight: '#fff176',
  },
  kiwi: {
    outer: '#8d6e43',
    inner: '#a8d848',
    seed: '#2d2d2d',
    highlight: '#c8e89a',
  },
  dragonfruit: {
    outer: '#e84393',
    inner: '#fff0f5',
    seed: '#1a1a1a',
    highlight: '#fd79a8',
  },
};

export const NORMAL_FRUIT_TYPES: TFruitType[] = [
  'watermelon',
  'orange',
  'apple',
  'banana',
  'kiwi',
];

export const BOMB_RADIUS = 30;
