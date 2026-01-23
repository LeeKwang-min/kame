import { TGrid, TAnimatedTile } from './types';
import { GRID_SIZE } from './config';

// 빈 그리드 생성
export const createEmptyGrid = (): TGrid => {
  return Array(GRID_SIZE)
    .fill(null)
    .map(() => Array(GRID_SIZE).fill(0));
};

// 빈 셀 찾기
export const getEmptyCells = (grid: TGrid): { row: number; col: number }[] => {
  const empty: { row: number; col: number }[] = [];
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] === 0) {
        empty.push({ row, col });
      }
    }
  }
  return empty;
};

// 랜덤 위치에 타일 추가
export const addRandomTile = (
  grid: TGrid,
): { row: number; col: number } | null => {
  const emptyCells = getEmptyCells(grid);
  if (emptyCells.length === 0) return null;

  const { row, col } =
    emptyCells[Math.floor(Math.random() * emptyCells.length)];
  grid[row][col] = Math.random() < 0.9 ? 2 : 4;
  return { row, col };
};

// 한 줄 슬라이드 + 병합 (이동 정보 포함)
type SlideResult = {
  newRow: number[];
  score: number;
  moved: boolean;
  moves: { from: number; to: number; value: number; merged?: boolean }[];
};

const slideRow = (row: number[]): SlideResult => {
  const moves: { from: number; to: number; value: number; merged?: boolean }[] =
    [];
  const newRow = Array(GRID_SIZE).fill(0);
  let writeIndex = 0;
  let score = 0;
  let moved = false;

  // 0이 아닌 값들의 원래 인덱스 저장
  const nonZero: { index: number; value: number }[] = [];
  for (let i = 0; i < GRID_SIZE; i++) {
    if (row[i] !== 0) {
      nonZero.push({ index: i, value: row[i] });
    }
  }

  let i = 0;
  while (i < nonZero.length) {
    const current = nonZero[i];

    // 다음 타일과 병합 가능한지 체크
    if (i + 1 < nonZero.length && nonZero[i + 1].value === current.value) {
      // 병합!
      const merged = current.value * 2;
      newRow[writeIndex] = merged;
      score += merged;

      // 두 타일 모두 이동 기록
      moves.push({ from: current.index, to: writeIndex, value: current.value });
      moves.push({
        from: nonZero[i + 1].index,
        to: writeIndex,
        value: nonZero[i + 1].value,
        merged: true,
      });

      writeIndex++;
      i += 2; // 두 타일 소비
    } else {
      // 병합 없이 이동
      newRow[writeIndex] = current.value;
      moves.push({ from: current.index, to: writeIndex, value: current.value });
      writeIndex++;
      i++;
    }
  }

  // 이동 여부 체크
  for (let j = 0; j < GRID_SIZE; j++) {
    if (row[j] !== newRow[j]) {
      moved = true;
      break;
    }
  }

  return { newRow, score, moved, moves };
};

// 그리드 회전 (시계방향 90도)
const rotateGrid = (grid: TGrid): TGrid => {
  const newGrid = createEmptyGrid();
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      newGrid[col][GRID_SIZE - 1 - row] = grid[row][col];
    }
  }
  return newGrid;
};

// 좌표 회전 (시계방향 90도)
const rotateCoord = (
  row: number,
  col: number,
): { row: number; col: number } => {
  return { row: col, col: GRID_SIZE - 1 - row };
};

// 좌표 역회전 (반시계방향 90도)
const unrotateCoord = (
  row: number,
  col: number,
): { row: number; col: number } => {
  return { row: GRID_SIZE - 1 - col, col: row };
};

// 방향별 이동 (애니메이션 정보 포함)
export const moveGrid = (
  grid: TGrid,
  direction: 'left' | 'right' | 'up' | 'down',
): {
  newGrid: TGrid;
  score: number;
  moved: boolean;
  animatedTiles: TAnimatedTile[];
} => {
  let workGrid = grid.map((row) => [...row]);
  let totalScore = 0;
  let anyMoved = false;
  const allMoves: TAnimatedTile[] = [];

  const rotations: Record<string, number> = {
    left: 0,
    down: 1,
    right: 2,
    up: 3,
  };

  const numRotations = rotations[direction];

  // 회전
  for (let i = 0; i < numRotations; i++) {
    workGrid = rotateGrid(workGrid);
  }

  // 각 행에 대해 왼쪽 슬라이드
  for (let row = 0; row < GRID_SIZE; row++) {
    const { newRow, score, moved, moves } = slideRow(workGrid[row]);
    workGrid[row] = newRow;
    totalScore += score;
    if (moved) anyMoved = true;

    // 이동 정보를 원래 좌표로 변환 (방향별 직접 매핑)
    for (const move of moves) {
      let fromRow: number, fromCol: number, toRow: number, toCol: number;

      switch (direction) {
        case 'left':
          fromRow = row;
          fromCol = move.from;
          toRow = row;
          toCol = move.to;
          break;
        case 'right':
          fromRow = GRID_SIZE - 1 - row;
          fromCol = GRID_SIZE - 1 - move.from;
          toRow = GRID_SIZE - 1 - row;
          toCol = GRID_SIZE - 1 - move.to;
          break;
        case 'up':
          fromRow = move.from;
          fromCol = GRID_SIZE - 1 - row;
          toRow = move.to;
          toCol = GRID_SIZE - 1 - row;
          break;
        case 'down':
          fromRow = GRID_SIZE - 1 - move.from;
          fromCol = row;
          toRow = GRID_SIZE - 1 - move.to;
          toCol = row;
          break;
      }

      allMoves.push({
        value: move.value,
        fromRow,
        fromCol,
        toRow,
        toCol,
        progress: 0,
        merged: move.merged,
      });
    }
  }

  // 그리드 역회전
  for (let i = 0; i < (4 - numRotations) % 4; i++) {
    workGrid = rotateGrid(workGrid);
  }

  return {
    newGrid: workGrid,
    score: totalScore,
    moved: anyMoved,
    animatedTiles: allMoves,
  };
};

// 이동 가능한지 체크
export const canMove = (grid: TGrid): boolean => {
  if (getEmptyCells(grid).length > 0) return true;

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      const val = grid[row][col];
      if (col < GRID_SIZE - 1 && grid[row][col + 1] === val) return true;
      if (row < GRID_SIZE - 1 && grid[row + 1][col] === val) return true;
    }
  }

  return false;
};

// 2048 달성 체크
export const hasWon = (grid: TGrid): boolean => {
  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      if (grid[row][col] >= 2048) return true;
    }
  }
  return false;
};
