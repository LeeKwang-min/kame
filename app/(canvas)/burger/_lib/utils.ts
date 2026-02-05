import { IngredientType, Ingredient } from './types';
import { INGREDIENTS, MIN_LAYERS_BY_LEVEL, MAX_LAYERS_BY_LEVEL } from './config';

const MIDDLE_INGREDIENTS: IngredientType[] = ['patty', 'cheese', 'lettuce', 'tomato', 'onion', 'pickle'];

export function generateRandomBurger(level: number): IngredientType[] {
  const cappedLevel = Math.min(level, 5);
  const minLayers = MIN_LAYERS_BY_LEVEL[cappedLevel] || 5;
  const maxLayers = MAX_LAYERS_BY_LEVEL[cappedLevel] || 6;
  const middleCount = Math.floor(Math.random() * (maxLayers - minLayers + 1)) + minLayers;

  const burger: IngredientType[] = ['bottom-bun'];

  for (let i = 0; i < middleCount; i++) {
    const randomIndex = Math.floor(Math.random() * MIDDLE_INGREDIENTS.length);
    burger.push(MIDDLE_INGREDIENTS[randomIndex]);
  }

  burger.push('top-bun');

  return burger;
}

export function getIngredientByType(type: IngredientType): Ingredient | undefined {
  return INGREDIENTS.find((i) => i.type === type);
}

export function calculateScore(level: number, baseScore: number, combo: number): number {
  const comboBonus = Math.min(combo, 10) * 0.1;
  return Math.floor(baseScore * level * (1 + comboBonus));
}

export function getTimeBonus(level: number, baseBonus: number): number {
  return Math.max(5, baseBonus - Math.floor(level / 3));
}
