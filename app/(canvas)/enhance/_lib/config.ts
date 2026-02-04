export const MAX_LEVEL = 25;

export const SUCCESS_RATES: number[] = [
  95, // 0→1
  90, // 1→2
  85, // 2→3
  80, // 3→4
  75, // 4→5
  70, // 5→6
  65, // 6→7
  60, // 7→8
  55, // 8→9
  50, // 9→10
  45, // 10→11
  40, // 11→12
  35, // 12→13
  30, // 13→14
  25, // 14→15
  20, // 15→16
  15, // 16→17
  12, // 17→18
  10, // 18→19
  8, // 19→20
  6, // 20→21
  4, // 21→22
  3, // 22→23
  2, // 23→24
  1, // 24→25
];

export const DESTROY_START_LEVEL = 10;

export const FAILURE_RATES: { maintain: number; downgrade: number; destroy: number }[] = (() => {
  const rates = [];
  for (let i = 0; i < MAX_LEVEL; i++) {
    if (i < DESTROY_START_LEVEL) {
      rates.push({ maintain: 60, downgrade: 40, destroy: 0 });
    } else {
      const destroyChance = Math.min(5 + (i - DESTROY_START_LEVEL) * 3, 30);
      const remaining = 100 - destroyChance;
      rates.push({
        maintain: Math.floor(remaining * 0.4),
        downgrade: Math.floor(remaining * 0.6),
        destroy: destroyChance,
      });
    }
  }
  return rates;
})();

// 등급별 설정
export const TIER_CONFIG = {
  common: {
    name: 'Common',
    nameKor: '일반',
    levels: [0, 1, 2, 3, 4],
    primaryColor: '#78909C',
    secondaryColor: '#B0BEC5',
    glowColor: '#90A4AE',
    particleCount: 0,
  },
  uncommon: {
    name: 'Uncommon',
    nameKor: '고급',
    levels: [5, 6, 7, 8, 9],
    primaryColor: '#43A047',
    secondaryColor: '#81C784',
    glowColor: '#66BB6A',
    particleCount: 4,
  },
  rare: {
    name: 'Rare',
    nameKor: '희귀',
    levels: [10, 11, 12, 13, 14],
    primaryColor: '#1E88E5',
    secondaryColor: '#64B5F6',
    glowColor: '#42A5F5',
    particleCount: 6,
  },
  epic: {
    name: 'Epic',
    nameKor: '영웅',
    levels: [15, 16, 17, 18, 19],
    primaryColor: '#8E24AA',
    secondaryColor: '#BA68C8',
    glowColor: '#AB47BC',
    particleCount: 8,
  },
  legendary: {
    name: 'Legendary',
    nameKor: '전설',
    levels: [20, 21, 22, 23, 24],
    primaryColor: '#FF8F00',
    secondaryColor: '#FFB74D',
    glowColor: '#FFA726',
    particleCount: 12,
  },
  mythic: {
    name: 'Mythic',
    nameKor: '신화',
    levels: [25],
    primaryColor: '#E53935',
    secondaryColor: '#FF8A80',
    glowColor: '#FF5252',
    particleCount: 16,
  },
} as const;

export type TierName = keyof typeof TIER_CONFIG;

export const getTierByLevel = (level: number): TierName => {
  if (level <= 4) return 'common';
  if (level <= 9) return 'uncommon';
  if (level <= 14) return 'rare';
  if (level <= 19) return 'epic';
  if (level <= 24) return 'legendary';
  return 'mythic';
};
