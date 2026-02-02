import { Point, WaveDirection } from './types';

// Mine 패턴: 경고 -> 위험 (한번에 터짐)
export type MinePattern = {
  type: 'mine';
  name: string;
  cells: Point[];
};

// Wave 패턴: 방향에 따라 순차적으로 터짐
export type WavePattern = {
  type: 'wave';
  name: string;
  direction: WaveDirection;
  cells: Point[]; // wave가 지나갈 영역
};

export type Pattern = MinePattern | WavePattern;

// ============================================
// Mine 패턴 정의
// ============================================

export const MINE_PATTERNS: MinePattern[] = [
  // 모서리 4칸
  {
    type: 'mine',
    name: 'corners',
    cells: [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
      { x: 2, y: 2 },
    ],
  },
  // 십자 (중앙 + 상하좌우)
  {
    type: 'mine',
    name: 'cross',
    cells: [
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 1, y: 2 },
    ],
  },
  // 대각선 (왼쪽 위 -> 오른쪽 아래)
  {
    type: 'mine',
    name: 'diagonal_main',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 2 },
    ],
  },
  // 대각선 (오른쪽 위 -> 왼쪽 아래)
  {
    type: 'mine',
    name: 'diagonal_anti',
    cells: [
      { x: 2, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 2 },
    ],
  },
  // 가로줄 상단
  {
    type: 'mine',
    name: 'row_top',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
    ],
  },
  // 가로줄 중앙
  {
    type: 'mine',
    name: 'row_middle',
    cells: [
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ],
  },
  // 가로줄 하단
  {
    type: 'mine',
    name: 'row_bottom',
    cells: [
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
  },
  // 세로줄 왼쪽
  {
    type: 'mine',
    name: 'col_left',
    cells: [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: 2 },
    ],
  },
  // 세로줄 중앙
  {
    type: 'mine',
    name: 'col_middle',
    cells: [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
    ],
  },
  // 세로줄 오른쪽
  {
    type: 'mine',
    name: 'col_right',
    cells: [
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ],
  },
  // 테두리 (가장자리 8칸)
  {
    type: 'mine',
    name: 'edges',
    cells: [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 0, y: 1 },
      { x: 2, y: 1 },
      { x: 0, y: 2 },
      { x: 1, y: 2 },
      { x: 2, y: 2 },
    ],
  },
  // 중앙만
  {
    type: 'mine',
    name: 'center',
    cells: [{ x: 1, y: 1 }],
  },
];

// ============================================
// Wave 패턴 정의
// ============================================

// 전체 맵 셀 (wave용)
const ALL_CELLS: Point[] = [
  { x: 0, y: 0 },
  { x: 1, y: 0 },
  { x: 2, y: 0 },
  { x: 0, y: 1 },
  { x: 1, y: 1 },
  { x: 2, y: 1 },
  { x: 0, y: 2 },
  { x: 1, y: 2 },
  { x: 2, y: 2 },
];

export const WAVE_PATTERNS: WavePattern[] = [
  // 오른쪽으로 밀려오는 파도
  {
    type: 'wave',
    name: 'wave_right',
    direction: 'right',
    cells: ALL_CELLS,
  },
  // 왼쪽으로 밀려오는 파도
  {
    type: 'wave',
    name: 'wave_left',
    direction: 'left',
    cells: ALL_CELLS,
  },
  // 아래로 밀려오는 파도
  {
    type: 'wave',
    name: 'wave_down',
    direction: 'down',
    cells: ALL_CELLS,
  },
  // 위로 밀려오는 파도
  {
    type: 'wave',
    name: 'wave_up',
    direction: 'up',
    cells: ALL_CELLS,
  },
];

// ============================================
// 전체 패턴 목록
// ============================================

export const ALL_PATTERNS: Pattern[] = [...MINE_PATTERNS, ...WAVE_PATTERNS];

// 패턴 이름으로 찾기
export const getPatternByName = (name: string): Pattern | undefined => {
  return ALL_PATTERNS.find((p) => p.name === name);
};

// 타입별 패턴 가져오기
export const getMinePatterns = (): MinePattern[] => MINE_PATTERNS;
export const getWavePatterns = (): WavePattern[] => WAVE_PATTERNS;

// 랜덤 패턴 선택
export const getRandomPattern = (patterns: Pattern[]): Pattern => {
  return patterns[Math.floor(Math.random() * patterns.length)];
};

// 모든 패턴 반환
export const getAvailablePatterns = (_level: number): Pattern[] => {
  return ALL_PATTERNS;
};
