import { TPattern } from '../types';
import { TIER_BASIC_TIME, TIER_MID_TIME, TIER_ADVANCED_TIME } from '../config';

const patterns: TPattern[] = [];

export function registerPattern(pattern: TPattern): void {
  patterns.push(pattern);
}

export function getAvailablePatterns(elapsedTime: number): TPattern[] {
  return patterns.filter((p) => {
    if (p.tier === 'basic') return elapsedTime >= TIER_BASIC_TIME;
    if (p.tier === 'mid') return elapsedTime >= TIER_MID_TIME;
    if (p.tier === 'advanced') return elapsedTime >= TIER_ADVANCED_TIME;
    return false;
  });
}

export function pickRandomPattern(elapsedTime: number): TPattern | null {
  const available = getAvailablePatterns(elapsedTime);
  if (available.length === 0) return null;
  return available[Math.floor(Math.random() * available.length)];
}

export function getAllPatterns(): TPattern[] {
  return [...patterns];
}
