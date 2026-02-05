export type IngredientType =
  | 'top-bun'
  | 'bottom-bun'
  | 'patty'
  | 'cheese'
  | 'lettuce'
  | 'tomato'
  | 'onion'
  | 'pickle';

export type IngredientShape =
  | 'top-bun'
  | 'bottom-bun'
  | 'patty'
  | 'cheese'
  | 'lettuce'
  | 'tomato'
  | 'onion'
  | 'pickle';

export interface Ingredient {
  type: IngredientType;
  name: { kor: string; eng: string };
  emoji: string;
  color: string;
  shape: IngredientShape;
}

export interface FallingAnimation {
  type: IngredientType;
  y: number;
  targetY: number;
  stackIndex: number;
}

export interface GameState {
  phase: 'start' | 'playing' | 'paused' | 'fail' | 'success' | 'gameover';
  timeLeft: number;
  score: number;
  level: number;
  combo: number;
  targetBurger: IngredientType[];
  playerBurger: IngredientType[];
  selectedIndex: number;
  failMessage: string;
  successMessage: string;
}
