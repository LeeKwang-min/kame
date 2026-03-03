import { TPattern } from './types';

// 각 패턴의 walls에 포함된 side가 "막힌 면", 나머지가 "열린 면"
// offset: 같은 패턴 내에서 벽 링 간 간격
// WALL_THICKNESS=20 기준, offset 160 → 140px 여유 공간
export const PATTERNS: TPattern[] = [
  // 1. 한 면만 열림 (side 5 열림) — 기본
  {
    walls: [
      { side: 0, offset: 0 },
      { side: 1, offset: 0 },
      { side: 2, offset: 0 },
      { side: 3, offset: 0 },
      { side: 4, offset: 0 },
    ],
  },
  // 2. 반대편 두 면 열림 (side 2, 5 열림) — 쉬움
  {
    walls: [
      { side: 0, offset: 0 },
      { side: 1, offset: 0 },
      { side: 3, offset: 0 },
      { side: 4, offset: 0 },
    ],
  },
  // 3. 인접 두 면 열림 (side 4, 5 열림) — 쉬움
  {
    walls: [
      { side: 0, offset: 0 },
      { side: 1, offset: 0 },
      { side: 2, offset: 0 },
      { side: 3, offset: 0 },
    ],
  },
  // 4. 나선형 3단계 (gap이 0→1→2로 회전)
  {
    walls: [
      { side: 1, offset: 0 },
      { side: 2, offset: 0 },
      { side: 3, offset: 0 },
      { side: 4, offset: 0 },
      { side: 5, offset: 0 },
      { side: 0, offset: 160 },
      { side: 2, offset: 160 },
      { side: 3, offset: 160 },
      { side: 4, offset: 160 },
      { side: 5, offset: 160 },
      { side: 0, offset: 320 },
      { side: 1, offset: 320 },
      { side: 3, offset: 320 },
      { side: 4, offset: 320 },
      { side: 5, offset: 320 },
    ],
  },
  // 5. 반반 (side 3,4,5 열림) — 넓은 틈
  {
    walls: [
      { side: 0, offset: 0 },
      { side: 1, offset: 0 },
      { side: 2, offset: 0 },
    ],
  },
  // 6. 교차 — 짝수면 막힘 (side 1,3,5 열림)
  {
    walls: [
      { side: 0, offset: 0 },
      { side: 2, offset: 0 },
      { side: 4, offset: 0 },
    ],
  },
  // 7. 교차 — 홀수면 막힘 (side 0,2,4 열림)
  {
    walls: [
      { side: 1, offset: 0 },
      { side: 3, offset: 0 },
      { side: 5, offset: 0 },
    ],
  },
  // 8. 이중 벽 (gap이 5→2로 이동)
  {
    walls: [
      { side: 0, offset: 0 },
      { side: 1, offset: 0 },
      { side: 2, offset: 0 },
      { side: 3, offset: 0 },
      { side: 4, offset: 0 },
      { side: 0, offset: 160 },
      { side: 1, offset: 160 },
      { side: 3, offset: 160 },
      { side: 4, offset: 160 },
      { side: 5, offset: 160 },
    ],
  },
  // 9. 교차 더블 (짝수→홀수)
  {
    walls: [
      { side: 0, offset: 0 },
      { side: 2, offset: 0 },
      { side: 4, offset: 0 },
      { side: 1, offset: 160 },
      { side: 3, offset: 160 },
      { side: 5, offset: 160 },
    ],
  },
  // 10. 나선형 6단계 (한 바퀴 회전)
  {
    walls: [
      { side: 1, offset: 0 },
      { side: 2, offset: 0 },
      { side: 3, offset: 0 },
      { side: 4, offset: 0 },
      { side: 5, offset: 0 },
      { side: 0, offset: 140 },
      { side: 2, offset: 140 },
      { side: 3, offset: 140 },
      { side: 4, offset: 140 },
      { side: 5, offset: 140 },
      { side: 0, offset: 280 },
      { side: 1, offset: 280 },
      { side: 3, offset: 280 },
      { side: 4, offset: 280 },
      { side: 5, offset: 280 },
      { side: 0, offset: 420 },
      { side: 1, offset: 420 },
      { side: 2, offset: 420 },
      { side: 4, offset: 420 },
      { side: 5, offset: 420 },
      { side: 0, offset: 560 },
      { side: 1, offset: 560 },
      { side: 2, offset: 560 },
      { side: 3, offset: 560 },
      { side: 5, offset: 560 },
      { side: 0, offset: 700 },
      { side: 1, offset: 700 },
      { side: 2, offset: 700 },
      { side: 3, offset: 700 },
      { side: 4, offset: 700 },
    ],
  },
  // 11. 한 면만 열림 (side 2 열림)
  {
    walls: [
      { side: 0, offset: 0 },
      { side: 1, offset: 0 },
      { side: 3, offset: 0 },
      { side: 4, offset: 0 },
      { side: 5, offset: 0 },
    ],
  },
  // 12. 이중 벽 교차 (gap 3→4)
  {
    walls: [
      { side: 0, offset: 0 },
      { side: 1, offset: 0 },
      { side: 2, offset: 0 },
      { side: 4, offset: 0 },
      { side: 5, offset: 0 },
      { side: 0, offset: 160 },
      { side: 1, offset: 160 },
      { side: 2, offset: 160 },
      { side: 3, offset: 160 },
      { side: 5, offset: 160 },
    ],
  },
];
