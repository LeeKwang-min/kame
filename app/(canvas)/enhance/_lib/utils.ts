import { FAILURE_RATES, SUCCESS_RATES, TIER_CONFIG, getTierByLevel } from './config';
import { EnhanceResult } from './types';

export const getSuccessRate = (level: number): number => {
  if (level < 0 || level >= SUCCESS_RATES.length) return 0;
  return SUCCESS_RATES[level];
};

export const rollEnhance = (level: number): EnhanceResult => {
  const successRate = getSuccessRate(level);
  const roll = Math.random() * 100;

  if (roll < successRate) {
    return 'success';
  }

  const failureRate = FAILURE_RATES[level];
  if (!failureRate) return 'maintain';

  const failRoll = Math.random() * 100;
  if (failRoll < failureRate.destroy) {
    return 'destroy';
  }
  if (failRoll < failureRate.destroy + failureRate.downgrade) {
    return 'downgrade';
  }
  return 'maintain';
};

export const getTierConfig = (level: number) => {
  const tierName = getTierByLevel(level);
  return TIER_CONFIG[tierName];
};

export const getResultText = (result: EnhanceResult): string => {
  switch (result) {
    case 'success':
      return '강화 성공!';
    case 'maintain':
      return '강화 실패 (유지)';
    case 'downgrade':
      return '강화 실패 (하락)';
    case 'destroy':
      return '장비 파괴!';
  }
};

export const getResultColor = (result: EnhanceResult): string => {
  switch (result) {
    case 'success':
      return '#4CAF50';
    case 'maintain':
      return '#FF9800';
    case 'downgrade':
      return '#FF5722';
    case 'destroy':
      return '#F44336';
  }
};
