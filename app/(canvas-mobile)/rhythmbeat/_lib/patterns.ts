import { TPattern } from './types';

// Beat values: 0=none, 1=D, 2=F, 3=J, 4=K, [n,m]=simultaneous

export const PATTERNS: TPattern[] = [
  // === Difficulty 1: 4-beat simple patterns ===
  { beats: [1, 0, 3, 0], difficulty: 1 },
  { beats: [0, 2, 0, 4], difficulty: 1 },
  { beats: [1, 2, 3, 4], difficulty: 1 },
  { beats: [4, 3, 2, 1], difficulty: 1 },
  { beats: [1, 0, 0, 3], difficulty: 1 },
  { beats: [2, 0, 0, 4], difficulty: 1 },
  { beats: [0, 1, 0, 4], difficulty: 1 },
  { beats: [3, 0, 1, 0], difficulty: 1 },
  { beats: [0, 4, 0, 2], difficulty: 1 },
  { beats: [1, 3, 0, 0], difficulty: 1 },

  // === Difficulty 2: 8-beat mixed patterns ===
  { beats: [1, 0, 2, 0, 3, 0, 4, 0], difficulty: 2 },
  { beats: [4, 0, 3, 0, 2, 0, 1, 0], difficulty: 2 },
  { beats: [1, 3, 0, 2, 4, 0, 1, 0], difficulty: 2 },
  { beats: [2, 4, 1, 3, 0, 0, 2, 4], difficulty: 2 },
  { beats: [1, 1, 3, 3, 2, 2, 4, 4], difficulty: 2 },
  { beats: [3, 0, 3, 1, 0, 1, 4, 0], difficulty: 2 },
  { beats: [0, 2, 3, 0, 4, 1, 0, 2], difficulty: 2 },
  { beats: [1, 2, 0, 3, 4, 0, 2, 1], difficulty: 2 },
  { beats: [4, 0, 2, 3, 0, 1, 4, 0], difficulty: 2 },
  { beats: [1, 0, 4, 0, 2, 0, 3, 0], difficulty: 2 },

  // === Difficulty 3: simultaneous notes + complex patterns ===
  { beats: [[1, 4], 0, [2, 3], 0, 1, 3, 2, 4], difficulty: 3 },
  { beats: [1, 2, 3, 4, [1, 3], 0, [2, 4], 0], difficulty: 3 },
  { beats: [[1, 2], 0, [3, 4], 0, [1, 2], 0, [3, 4], 0], difficulty: 3 },
  { beats: [1, 3, [2, 4], 0, 4, 2, [1, 3], 0], difficulty: 3 },
  { beats: [[1, 4], 2, 3, [1, 4], 0, 2, 3, 0], difficulty: 3 },
  { beats: [1, [2, 3], 4, 0, 3, [1, 4], 2, 0], difficulty: 3 },
  { beats: [[2, 3], 1, 4, [1, 4], 2, [2, 3], 1, 4], difficulty: 3 },
  { beats: [1, 2, [1, 4], 3, 4, 3, [2, 3], 1], difficulty: 3 },
];
