import { Ingredient } from './types';

export const CANVAS_WIDTH = 700;
export const CANVAS_HEIGHT = 600;

export const INITIAL_TIME = 15;
export const TIME_BONUS = 5;
export const BASE_SCORE = 100;

export const INGREDIENT_HEIGHT = 28;
export const INGREDIENT_WIDTH = 100;
export const FALL_SPEED = 12;

export const INGREDIENTS: Ingredient[] = [
  { type: 'top-bun', name: { kor: '윗빵', eng: 'Top Bun' }, emoji: '🍞', color: '#D4A574', shape: 'top-bun' },
  { type: 'bottom-bun', name: { kor: '아랫빵', eng: 'Bottom Bun' }, emoji: '🥯', color: '#C4956A', shape: 'bottom-bun' },
  { type: 'patty', name: { kor: '패티', eng: 'Patty' }, emoji: '🍖', color: '#8B4513', shape: 'patty' },
  { type: 'cheese', name: { kor: '치즈', eng: 'Cheese' }, emoji: '🧀', color: '#FFD700', shape: 'cheese' },
  { type: 'lettuce', name: { kor: '양상추', eng: 'Lettuce' }, emoji: '🥬', color: '#90EE90', shape: 'lettuce' },
  { type: 'tomato', name: { kor: '토마토', eng: 'Tomato' }, emoji: '🍅', color: '#FF6347', shape: 'tomato' },
  { type: 'onion', name: { kor: '양파', eng: 'Onion' }, emoji: '🧅', color: '#DDA0DD', shape: 'onion' },
  { type: 'pickle', name: { kor: '피클', eng: 'Pickle' }, emoji: '🥒', color: '#9ACD32', shape: 'pickle' },
];

export const GRID_COLS = 4;
export const GRID_ROWS = 2;

export const MIN_LAYERS_BY_LEVEL: Record<number, number> = {
  1: 2,
  2: 2,
  3: 3,
  4: 3,
  5: 4,
};

export const MAX_LAYERS_BY_LEVEL: Record<number, number> = {
  1: 2,
  2: 3,
  3: 3,
  4: 4,
  5: 5,
};
