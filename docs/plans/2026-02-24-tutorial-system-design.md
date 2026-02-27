# Tutorial System & Queens Logic Solver Design

**Date**: 2026-02-24
**Scope**: Queens tutorial, Ripple tutorial refactor, Queens puzzle logic improvement

---

## 1. Overview

### Goals
1. Queens 퍼즐에 단계별 튜토리얼 추가
2. Queens & Ripple 시작 화면에 "가이드" 버튼 상시 노출 (기존 최초 1회 자동 튜토리얼 제거)
3. Queens 퍼즐 생성 시 논리적 풀이 가능성 보장 (constraint propagation)

### Approach
게임별 독립 구현 (접근 방식 A). 각 게임의 game.ts에서 튜토리얼 상태를 관리하되, 시작 화면에 가이드 버튼을 추가하는 패턴은 통일.

---

## 2. Start Screen Guide Button (Common Pattern)

### UI Layout

**Queens:**
```
┌─────────────────────────────┐
│       Queens                 │
│  Place N queens with no...   │
│                              │
│  [Easy 5x5] [Normal 7x7] [Hard 9x9]  │
│                              │
│        [ 가이드 ]             │  ← 난이도 카드 하단
│                              │
│  1: Easy  2: Normal  3: Hard │
│      G: 가이드               │
└──────────────────────────────┘
```

**Ripple:**
```
┌─────────────────────────────┐
│       Ripple                 │
│  Place stones to match...    │
│                              │
│     [ S를 눌러 시작 ]         │
│                              │
│        [ 가이드 ]             │  ← 시작 버튼 하단
│                              │
└──────────────────────────────┘
```

### Interaction
- **Keyboard**: `KeyG` → 가이드 진입
- **Mouse**: 가이드 버튼 클릭
- **Touch**: 가이드 버튼 탭
- 가이드 진입 시 state를 `'tutorial'`로 전환

### Ripple Changes
- `localStorage` 기반 자동 튜토리얼 트리거 제거 (`TUTORIAL_STORAGE_KEY` 관련 코드 삭제)
- 기존 튜토리얼 렌더링/로직은 유지
- 시작 화면에 가이드 버튼 추가
- `KeyS` → 항상 게임 시작 (튜토리얼 체크 없이)

---

## 3. Queens Tutorial (6 Steps)

### Tutorial Grid
- 4x4 미니 그리드 사용 (고정)
- 4개 영역 (4색)으로 구성

### Steps

| Step | Message | Visual | Interaction |
|------|---------|--------|-------------|
| 0 | "각 행에 퀸을 1개씩 배치하세요" | 같은 행에 퀸 2개 → 빨간 하이라이트 + 행 강조 | 탭/키로 다음 |
| 1 | "각 열에도 퀸은 1개만!" | 같은 열에 퀸 2개 → 빨간 하이라이트 + 열 강조 | 탭/키로 다음 |
| 2 | "같은 색 영역에도 퀸은 1개만!" | 같은 영역에 퀸 2개 → 영역 전체 빨간 테두리 | 탭/키로 다음 |
| 3 | "퀸은 대각선으로 인접할 수 없습니다" | 대각선 인접 퀸 → 인접 셀 빨간 표시 | 탭/키로 다음 |
| 4 | "직접 풀어보세요!" | 4x4 체험 퍼즐, 힌트 셀 펄싱 | 직접 퍼즐 풀기 |
| 5 | "준비 완료! 이제 진짜 퍼즐을 풀어봅시다" | 축하 파티클 | 탭/키로 완료 |

### Step 0-3: Rule Visualization
- 미리 만든 고정 보드에 규칙 위반 예시를 보여줌
- 위반 셀은 빨간 하이라이트 + 흔들기 애니메이션
- 올바른 셀은 초록 체크

### Step 4: Practice Puzzle
- 고정된 간단한 4x4 퍼즐 (하드코딩)
- 논리적으로 쉽게 풀리는 퍼즐
- 첫 번째 놓아야 할 셀이 펄싱 (Ripple 패턴)
- 잘못된 배치 시 즉시 피드백 (흔들기 + 메시지)

### Step 5: Completion
- 축하 메시지 + 파티클
- state를 `'start'`로 전환

---

## 4. Queens Puzzle Logic Solver

### Current Flow
```
generatePuzzle(size)
  1. generateRandomRegions(n) → region map
  2. findUniqueSolution(n, regions) → solution or null
  3. null이면 재시도
```

### New Flow
```
generatePuzzle(size)
  1. generateRandomRegions(n) → region map
  2. findUniqueSolution(n, regions) → solution or null
  3. null이면 재시도
  4. [NEW] canSolveLogically(n, regions) → boolean
  5. false이면 재시도
```

### Logical Solver (`canSolveLogically`)

반복적으로 다음 규칙을 적용하여 모든 퀸 위치를 확정할 수 있는지 검증:

1. **Naked Single**: 특정 셀이 해당 행/열/영역에서 유일한 후보이면 확정
2. **Elimination**: 확정된 퀸의 같은 행/열/영역/8방향 인접 셀을 후보에서 제거
3. **Hidden Single**: 특정 행/열/영역에서 후보가 1곳뿐이면 확정

```typescript
function canSolveLogically(n: number, regions: number[][]): boolean {
  // candidates[row][col] = true if queen can be placed here
  const candidates: boolean[][] = Array(n).fill(null).map(() => Array(n).fill(true));
  const placed: boolean[][] = Array(n).fill(null).map(() => Array(n).fill(false));
  let placedCount = 0;

  let progress = true;
  while (progress && placedCount < n) {
    progress = false;

    // Rule: Hidden Single - 행/열/영역에서 후보가 1곳뿐이면 확정
    for (each row/col/region) {
      if (only one candidate cell) {
        place queen at that cell;
        eliminate from same row, col, region, and 8-adjacent;
        progress = true;
      }
    }
  }

  return placedCount === n;
}
```

### Performance Considerations
- constraint propagation은 O(n^3) 수준으로 매우 빠름
- 9x9에서도 무시할 수 있는 수준
- 재시도 횟수가 늘어날 수 있지만, 기존 maxAttempts (10000) 내에서 충분
- 만약 maxAttempts 내에서 못 찾으면 기존처럼 에러 핸들링

---

## 5. Files to Modify

### Queens
- `app/(canvas-mobile)/queens/_lib/game.ts` - 튜토리얼 state, 렌더링, 이벤트 처리 추가
- `app/(canvas-mobile)/queens/_lib/generator.ts` - `canSolveLogically()` 함수 추가

### Ripple
- `app/(canvas-mobile)/ripple/_lib/game.ts` - localStorage 자동 트리거 제거, 시작 화면에 가이드 버튼 추가
