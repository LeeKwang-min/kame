import { TRow, TRowType, TObstacle, TMovingEntity } from './types';
import {
  CELL_SIZE,
  GRID_COLS,
  CANVAS_WIDTH,
  GRASS_OBSTACLE_CHANCE,
  GRASS_MIN_PASSABLE,
  CAR_MIN_SPEED,
  CAR_MAX_SPEED,
  CAR_SPAWN_MIN,
  CAR_SPAWN_MAX,
  CAR_WIDTH,
  CAR_HEIGHT,
  TRUCK_WIDTH,
  TRUCK_HEIGHT,
  TRAIN_COOLDOWN_MIN,
  TRAIN_COOLDOWN_MAX,
  LOG_MIN_SPEED,
  LOG_MAX_SPEED,
  LOG_SPAWN_MIN,
  LOG_SPAWN_MAX,
  LOG_WIDTH,
  LOG_HEIGHT,
  LILYPAD_WIDTH,
  LILYPAD_HEIGHT,
  DIFFICULTY_SCALE,
  MAX_DIFFICULTY,
  CAR_COLORS,
  TRUCK_COLORS,
} from './config';

// ==================== 좌표 변환 ====================

export const getPlayfieldOffsetX = (canvasWidth: number): number => {
  return (canvasWidth - GRID_COLS * CELL_SIZE) / 2;
};

export const colToX = (col: number, offsetX: number): number => {
  return offsetX + col * CELL_SIZE;
};

export const worldToScreenY = (worldY: number, cameraY: number): number => {
  return worldY - cameraY;
};

export const hopArcOffset = (progress: number, arcHeight: number): number => {
  return -Math.sin(progress * Math.PI) * arcHeight;
};

// ==================== 난이도 계산 ====================

export const getDifficulty = (score: number): number => {
  return Math.min(MAX_DIFFICULTY, 1 + score * DIFFICULTY_SCALE);
};

// ==================== 랜덤 유틸 ====================

const randRange = (min: number, max: number): number => {
  return min + Math.random() * (max - min);
};

const randInt = (min: number, max: number): number => {
  return Math.floor(randRange(min, max + 1));
};

const pickRandom = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

// ==================== 지형 생성 ====================

export const createGrassRow = (index: number): TRow => {
  const obstacles: TObstacle[] = [];
  const occupied = new Set<number>();

  for (let col = 0; col < GRID_COLS; col++) {
    if (Math.random() < GRASS_OBSTACLE_CHANCE) {
      obstacles.push({
        col,
        type: Math.random() > 0.5 ? 'tree' : 'rock',
      });
      occupied.add(col);
    }
  }

  // Ensure minimum passable cells
  const passable = GRID_COLS - occupied.size;
  if (passable < GRASS_MIN_PASSABLE) {
    const toRemove = GRASS_MIN_PASSABLE - passable;
    const obstacleCols = [...occupied];
    for (let i = 0; i < toRemove; i++) {
      const removeIdx = randInt(0, obstacleCols.length - 1);
      const removeCol = obstacleCols.splice(removeIdx, 1)[0];
      const idx = obstacles.findIndex((o) => o.col === removeCol);
      if (idx !== -1) obstacles.splice(idx, 1);
    }
  }

  return {
    type: 'grass',
    worldY: -index * CELL_SIZE,
    index,
    obstacles,
    entities: [],
    direction: 'right',
    speed: 0,
    spawnTimer: 0,
    spawnInterval: 0,
    warningActive: false,
    warningTimer: 0,
    trainCooldown: 0,
    trainPassed: false,
    initialSpawned: true,
  };
};

export const createRoadRow = (index: number, difficulty: number): TRow => {
  const direction = Math.random() > 0.5 ? 'left' : 'right';
  const speedBase = randRange(CAR_MIN_SPEED, CAR_MAX_SPEED);
  const speed = speedBase * (0.8 + difficulty * 0.2);
  const spawnBase = randRange(CAR_SPAWN_MIN, CAR_SPAWN_MAX);
  const spawnInterval = spawnBase / (0.7 + difficulty * 0.3);

  return {
    type: 'road',
    worldY: -index * CELL_SIZE,
    index,
    obstacles: [],
    entities: [],
    direction,
    speed,
    spawnTimer: randRange(0, spawnInterval * 0.5),
    spawnInterval,
    warningActive: false,
    warningTimer: 0,
    trainCooldown: 0,
    trainPassed: false,
    initialSpawned: true,
  };
};

export const createRailwayRow = (index: number, difficulty: number): TRow => {
  const cooldown = randRange(
    TRAIN_COOLDOWN_MIN / (0.5 + difficulty * 0.5),
    TRAIN_COOLDOWN_MAX / (0.5 + difficulty * 0.5),
  );

  return {
    type: 'railway',
    worldY: -index * CELL_SIZE,
    index,
    obstacles: [],
    entities: [],
    direction: Math.random() > 0.5 ? 'left' : 'right',
    speed: 0,
    spawnTimer: 0,
    spawnInterval: 0,
    warningActive: false,
    warningTimer: 0,
    trainCooldown: cooldown,
    trainPassed: false,
    initialSpawned: true,
  };
};

export const createRiverRow = (index: number, difficulty: number): TRow => {
  const direction = Math.random() > 0.5 ? 'left' : 'right';
  const speedBase = randRange(LOG_MIN_SPEED, LOG_MAX_SPEED);
  const speed = speedBase * (0.8 + difficulty * 0.2);
  const spawnBase = randRange(LOG_SPAWN_MIN, LOG_SPAWN_MAX);
  const spawnInterval = spawnBase / (0.7 + difficulty * 0.3);

  return {
    type: 'river',
    worldY: -index * CELL_SIZE,
    index,
    obstacles: [],
    entities: [],
    direction,
    speed,
    spawnTimer: spawnInterval,
    spawnInterval,
    warningActive: false,
    warningTimer: 0,
    trainCooldown: 0,
    trainPassed: false,
    initialSpawned: false,
  };
};

// ==================== 지형 타입 선택 ====================

export const selectNextRowType = (difficulty: number, prevTypes: TRowType[]): TRowType => {
  // Prevent more than 3 consecutive same types
  const last3 = prevTypes.slice(-3);
  const allSame = last3.length === 3 && last3.every((t) => t === last3[0]);

  // Base weights: grass=40, road=30, railway=10, river=20
  // As difficulty increases, reduce grass, increase dangerous types
  const grassWeight = Math.max(15, 40 - difficulty * 8);
  const roadWeight = 30 + difficulty * 3;
  const railwayWeight = 10 + difficulty * 4;
  const riverWeight = 20 + difficulty * 3;

  const weights: { type: TRowType; weight: number }[] = [
    { type: 'grass', weight: grassWeight },
    { type: 'road', weight: roadWeight },
    { type: 'railway', weight: railwayWeight },
    { type: 'river', weight: riverWeight },
  ];

  // Remove type if 3 consecutive
  const filtered = allSame ? weights.filter((w) => w.type !== last3[0]) : weights;

  const totalWeight = filtered.reduce((sum, w) => sum + w.weight, 0);
  let random = Math.random() * totalWeight;

  for (const w of filtered) {
    random -= w.weight;
    if (random <= 0) return w.type;
  }

  return 'grass';
};

export const createRow = (index: number, type: TRowType, difficulty: number): TRow => {
  switch (type) {
    case 'grass':
      return createGrassRow(index);
    case 'road':
      return createRoadRow(index, difficulty);
    case 'railway':
      return createRailwayRow(index, difficulty);
    case 'river':
      return createRiverRow(index, difficulty);
  }
};

// ==================== 엔티티 스폰 ====================

export const spawnVehicle = (row: TRow, playfieldWidth: number, offsetX: number): TMovingEntity | null => {
  const isTruck = Math.random() > 0.6;
  const width = isTruck ? TRUCK_WIDTH : CAR_WIDTH;
  const height = isTruck ? TRUCK_HEIGHT : CAR_HEIGHT;
  const color = isTruck ? pickRandom(TRUCK_COLORS) : pickRandom(CAR_COLORS);

  const startX =
    row.direction === 'right' ? offsetX - width : offsetX + playfieldWidth;

  return {
    x: startX,
    width,
    height,
    speed: row.speed,
    direction: row.direction,
    type: isTruck ? 'truck' : 'car',
    color,
  };
};

export const spawnLogOrLilypad = (row: TRow, playfieldWidth: number, offsetX: number): TMovingEntity => {
  const isLily = Math.random() > 0.65;
  const width = isLily ? LILYPAD_WIDTH : LOG_WIDTH;
  const height = isLily ? LILYPAD_HEIGHT : LOG_HEIGHT;

  const startX =
    row.direction === 'right' ? offsetX - width : offsetX + playfieldWidth;

  return {
    x: startX,
    width,
    height,
    speed: row.speed,
    direction: row.direction,
    type: isLily ? 'lilypad' : 'log',
    color: isLily ? '#2ecc71' : '#8B4513',
  };
};

export const spawnInitialRiverEntities = (
  row: TRow,
  playfieldWidth: number,
  offsetX: number,
): void => {
  if (row.initialSpawned) return;
  row.initialSpawned = true;

  // Place 2-4 platforms spread across the row
  const count = randInt(2, 4);
  const spacing = playfieldWidth / count;

  for (let i = 0; i < count; i++) {
    const isLily = Math.random() > 0.65;
    const width = isLily ? LILYPAD_WIDTH : LOG_WIDTH;
    const height = isLily ? LILYPAD_HEIGHT : LOG_HEIGHT;
    const x = offsetX + i * spacing + randRange(0, spacing - width);

    row.entities.push({
      x,
      width,
      height,
      speed: row.speed,
      direction: row.direction,
      type: isLily ? 'lilypad' : 'log',
      color: isLily ? '#2ecc71' : '#8B4513',
    });
  }
};

// ==================== 엔티티 업데이트 ====================

export const isEntityOffscreen = (
  entity: TMovingEntity,
  playfieldWidth: number,
  offsetX: number,
): boolean => {
  if (entity.direction === 'right') {
    return entity.x > offsetX + playfieldWidth + 50;
  }
  return entity.x + entity.width < offsetX - 50;
};
