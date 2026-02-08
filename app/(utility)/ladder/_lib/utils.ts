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

// 사다리 가로선 생성 (1:1 매칭 보장)
export const generateLadderLines = (
  columnCount: number,
  rowCount: number
): LadderLine[] => {
  const lines: LadderLine[] = [];

  // 각 row에서 랜덤하게 가로선 추가
  for (let row = 1; row < rowCount; row++) {
    // 이 row에서 사용된 column 추적 (가로선의 시작점과 끝점 모두)
    const usedInRow = new Set<number>();

    // 각 row에서 추가할 가로선 수 (최대 ceil((columnCount-1)/2)개까지 가능)
    const maxLines = Math.ceil((columnCount - 1) / 2);
    const lineCount = Math.min(
      columnCount <= 2
        ? (Math.random() < 0.6 ? 1 : 0)
        : (Math.random() > 0.3 ? 2 : 1),
      maxLines,
    );

    // 사용 가능한 시작 column 목록
    const availableColumns = Array.from(
      { length: columnCount - 1 },
      (_, i) => i
    );

    // 셔플하여 랜덤하게 선택
    for (let i = availableColumns.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableColumns[i], availableColumns[j]] = [availableColumns[j], availableColumns[i]];
    }

    let addedCount = 0;
    for (const fromColumn of availableColumns) {
      if (addedCount >= lineCount) break;

      const toColumn = fromColumn + 1;

      // 시작점과 끝점 모두 사용되지 않았는지 확인 (인접 가로선 방지)
      if (!usedInRow.has(fromColumn) && !usedInRow.has(toColumn)) {
        lines.push({
          fromColumn,
          toColumn,
          row,
        });
        // 시작점과 끝점 모두 사용됨으로 표시
        usedInRow.add(fromColumn);
        usedInRow.add(toColumn);
        addedCount++;
      }
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
