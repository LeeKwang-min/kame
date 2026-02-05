import { LadderLine, LadderPath } from './types';

// Fisher-Yates shuffle
export const shuffleArray = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// 사다리 가로선 생성
export const generateLadderLines = (
  columnCount: number,
  rowCount: number
): LadderLine[] => {
  const lines: LadderLine[] = [];
  const usedPositions = new Set<string>();

  // 각 row에서 랜덤하게 가로선 추가
  for (let row = 1; row < rowCount; row++) {
    // 각 row에서 1~2개의 가로선 추가
    const lineCount = Math.random() > 0.3 ? 2 : 1;
    const availableColumns = Array.from(
      { length: columnCount - 1 },
      (_, i) => i
    );

    for (let i = 0; i < lineCount && availableColumns.length > 0; i++) {
      const randomIdx = Math.floor(Math.random() * availableColumns.length);
      const fromColumn = availableColumns[randomIdx];

      // 같은 row에서 인접한 칸이 이미 사용되지 않았는지 확인
      const key = `${row}-${fromColumn}`;
      const leftKey = `${row}-${fromColumn - 1}`;

      if (!usedPositions.has(key) && !usedPositions.has(leftKey)) {
        lines.push({
          fromColumn,
          toColumn: fromColumn + 1,
          row,
        });
        usedPositions.add(key);
      }

      availableColumns.splice(randomIdx, 1);
    }
  }

  return lines;
};

// 사다리 경로 계산
export const calculatePath = (
  startIndex: number,
  lines: LadderLine[],
  columnCount: number,
  rowCount: number,
  width: number,
  height: number
): LadderPath => {
  const columnWidth = width / (columnCount + 1);
  const rowHeight = height / (rowCount + 1);

  const points: { x: number; y: number }[] = [];
  let currentColumn = startIndex;
  let currentRow = 0;

  // 시작점
  points.push({
    x: columnWidth * (currentColumn + 1),
    y: rowHeight * currentRow,
  });

  // 각 row를 순회하며 경로 계산
  for (let row = 1; row <= rowCount; row++) {
    // 현재 위치에서 가로선이 있는지 확인
    const lineFromCurrent = lines.find(
      (l) => l.row === row && l.fromColumn === currentColumn
    );
    const lineToCurrent = lines.find(
      (l) => l.row === row && l.toColumn === currentColumn
    );

    if (lineFromCurrent) {
      // 오른쪽으로 이동
      points.push({
        x: columnWidth * (currentColumn + 1),
        y: rowHeight * row,
      });
      currentColumn = lineFromCurrent.toColumn;
      points.push({
        x: columnWidth * (currentColumn + 1),
        y: rowHeight * row,
      });
    } else if (lineToCurrent) {
      // 왼쪽으로 이동
      points.push({
        x: columnWidth * (currentColumn + 1),
        y: rowHeight * row,
      });
      currentColumn = lineToCurrent.fromColumn;
      points.push({
        x: columnWidth * (currentColumn + 1),
        y: rowHeight * row,
      });
    }
  }

  // 끝점
  points.push({
    x: columnWidth * (currentColumn + 1),
    y: rowHeight * (rowCount + 1),
  });

  return {
    points,
    startIndex,
    endIndex: currentColumn,
  };
};
