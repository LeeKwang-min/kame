import {
  createGameOverHud,
  gamePauseHud,
  gameStartHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import { rectRectHit } from '@/lib/utils';
import { TDeathType, TParticle, TPlayer, TRow, TRowType } from './types';
import {
  CELL_SIZE,
  GRID_COLS,
  CANVAS_HEIGHT,
  HOP_DURATION,
  HOP_ARC_HEIGHT,
  PLAYER_HITBOX_SHRINK,
  CAMERA_SMOOTH_SPEED,
  CAMERA_TARGET_Y_RATIO,
  CAMERA_PUSH_SPEED_BASE,
  ROWS_AHEAD,
  ROWS_BEHIND,
  INITIAL_SAFE_ROWS,
  TRAIN_SPEED,
  TRAIN_WIDTH,
  TRAIN_HEIGHT,
  WARNING_DURATION,
  DIFFICULTY_SCALE,
  MAX_DIFFICULTY,
  DEATH_ANIM_DURATION,
  TRAIN_WARNING_SHAKE,
  PARTICLE_GRAVITY,
  VEHICLE_MIN_GAP,
} from './config';
import {
  getPlayfieldOffsetX,
  colToX,
  worldToScreenY,
  hopArcOffset,
  getDifficulty,
  createRow,
  selectNextRowType,
  spawnVehicle,
  spawnLogOrLilypad,
  spawnInitialRiverEntities,
  isEntityOffscreen,
} from './utils';

export type TCrossyRoadCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupCrossyRoad = (
  canvas: HTMLCanvasElement,
  callbacks?: TCrossyRoadCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== State ====================
  let player: TPlayer = {
    col: Math.floor(GRID_COLS / 2),
    rowIndex: 0,
    x: 0,
    y: 0,
    hopStartX: 0,
    hopStartY: 0,
    targetX: 0,
    targetY: 0,
    hopProgress: 0,
    isHopping: false,
    highestRow: 0,
    isDead: false,
    deathType: null,
    facing: 'right',
  };

  let rows: TRow[] = [];
  let rowTypes: TRowType[] = [];
  let score = 0;
  let isStarted = false;
  let isGameOver = false;
  let isPaused = false;
  let lastTime = 0;
  let highestRowGenerated = 0;

  // Camera
  let cameraY = 0;
  let targetCameraY = 0;
  let deadlineY = 0; // world Y of deadline (increases upward = more negative)

  // Death animation
  let deathTimer = 0;
  let deathAnimProgress = 0;

  // Particles
  let particles: TParticle[] = [];

  // Playfield offset
  let offsetX = 0;
  let playfieldWidth = 0;

  // Game Over HUD
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      if (callbacks?.onScoreSave) {
        return callbacks.onScoreSave(finalScore);
      }
      return { saved: false };
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(canvas, ctx, 'crossyroad', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // ==================== Helpers ====================

  const getRowByIndex = (idx: number): TRow | undefined => {
    return rows.find((r) => r.index === idx);
  };

  const playerWorldX = (): number => {
    return colToX(player.col, offsetX);
  };

  const playerWorldY = (): number => {
    return -player.rowIndex * CELL_SIZE;
  };

  // ==================== Init ====================

  const generateRows = () => {
    const rect = canvas.getBoundingClientRect();
    const cameraTopRow = Math.floor(-cameraY / CELL_SIZE) + Math.ceil(rect.height / CELL_SIZE);
    const targetRow = cameraTopRow + ROWS_AHEAD;

    while (highestRowGenerated < targetRow) {
      highestRowGenerated++;

      let type: TRowType;
      if (highestRowGenerated <= INITIAL_SAFE_ROWS) {
        type = 'grass';
      } else {
        const difficulty = getDifficulty(score);
        type = selectNextRowType(difficulty, rowTypes);
      }

      rowTypes.push(type);
      const difficulty = getDifficulty(score);
      const prevRow = rows.length > 0 ? rows[rows.length - 1] : undefined;
      const row = createRow(highestRowGenerated, type, difficulty, prevRow);
      rows.push(row);
    }
  };

  const cleanupRows = () => {
    const rect = canvas.getBoundingClientRect();
    const cameraBottomRow = Math.floor(-(cameraY + rect.height) / CELL_SIZE);
    const minRow = cameraBottomRow - ROWS_BEHIND;

    rows = rows.filter((r) => r.index >= minRow);
  };

  const initGame = () => {
    const rect = canvas.getBoundingClientRect();
    offsetX = getPlayfieldOffsetX(rect.width);
    playfieldWidth = GRID_COLS * CELL_SIZE;

    // Create initial row (row 0 = starting grass)
    rows = [];
    rowTypes = [];
    highestRowGenerated = 0;

    const startRow = createRow(0, 'grass', 1);
    startRow.obstacles = []; // clear starting row
    rows.push(startRow);
    rowTypes.push('grass');

    generateRows();

    // Init river entities for visible rows
    for (const row of rows) {
      if (row.type === 'river') {
        spawnInitialRiverEntities(row, playfieldWidth, offsetX);
      }
    }
  };

  const startGame = async () => {
    if (isStarted) return;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isStarted = true;
    lastTime = 0;
  };

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();
    offsetX = getPlayfieldOffsetX(rect.width);
    playfieldWidth = GRID_COLS * CELL_SIZE;

    isStarted = false;
    isGameOver = false;
    isPaused = false;
    score = 0;
    lastTime = 0;
    gameOverHud.reset();

    player = {
      col: Math.floor(GRID_COLS / 2),
      rowIndex: 0,
      x: colToX(Math.floor(GRID_COLS / 2), offsetX),
      y: 0,
      hopStartX: colToX(Math.floor(GRID_COLS / 2), offsetX),
      hopStartY: 0,
      targetX: colToX(Math.floor(GRID_COLS / 2), offsetX),
      targetY: 0,
      hopProgress: 0,
      isHopping: false,
      highestRow: 0,
      isDead: false,
      deathType: null,
      facing: 'right',
    };

    // Death animation & particles
    deathTimer = 0;
    deathAnimProgress = 0;
    particles = [];

    // Camera
    const targetPlayerScreenY = rect.height * CAMERA_TARGET_Y_RATIO;
    cameraY = player.y - targetPlayerScreenY;
    targetCameraY = cameraY;
    deadlineY = cameraY + rect.height + CELL_SIZE * 2;

    initGame();
  };

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    resetGame();
  };

  // ==================== Player Movement ====================

  const tryHop = (dCol: number, dRow: number) => {
    if (!isStarted || isGameOver || isPaused || player.isHopping || player.isDead) return;

    const newCol = player.col + dCol;
    const newRow = player.rowIndex + dRow;

    // Boundary check
    if (newCol < 0 || newCol >= GRID_COLS) return;
    if (newRow < 0) return; // can't go behind start

    // Check grass obstacles
    const targetRow = getRowByIndex(newRow);
    if (targetRow && targetRow.type === 'grass') {
      const hasObstacle = targetRow.obstacles.some((o) => o.col === newCol);
      if (hasObstacle) return;
    }

    // Set facing direction
    if (dCol < 0) player.facing = 'left';
    else if (dCol > 0) player.facing = 'right';

    // Dust particles at jump origin
    spawnParticles(player.x + CELL_SIZE / 2, player.y + CELL_SIZE, 4, {
      colors: ['#9ca3af', '#6b7280', '#d4d4d4'],
      speedMin: 15,
      speedMax: 50,
      sizeMin: 2,
      sizeMax: 4,
      lifeMin: 0.2,
      lifeMax: 0.5,
      gravity: 80,
      directionBias: { x: 0, y: 20 },
    });

    // Start hop
    player.isHopping = true;
    player.hopProgress = 0;
    player.hopStartX = player.x;
    player.hopStartY = player.y;
    player.targetX = colToX(newCol, offsetX);
    player.targetY = -newRow * CELL_SIZE;
    player.col = newCol;
    player.rowIndex = newRow;

    // Score
    if (newRow > player.highestRow) {
      score += newRow - player.highestRow;
      player.highestRow = newRow;
    }
  };

  // ==================== Input ====================

  const onKeyDown = (e: KeyboardEvent) => {
    // Game start
    if (e.code === 'KeyS') {
      if (isPaused) {
        isPaused = false;
        lastTime = 0;
        return;
      }
      if (!isStarted && !isGameOver) {
        startGame();
        return;
      }
    }

    if (e.code === 'KeyP' && isStarted && !isGameOver) {
      isPaused = true;
      return;
    }

    // Game over HUD
    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, Math.floor(score));
      if (handled) return;
    }

    // Restart
    if (e.code === 'KeyR' && !isGameOver && !isPaused) {
      resetGame();
      return;
    }

    if (isPaused || !isStarted || isGameOver || player.isDead) return;

    // Allow e.repeat for continuous movement (but hop blocks during animation)
    // Movement
    if (e.code === 'ArrowUp' || e.code === 'KeyW') {
      tryHop(0, 1);
      e.preventDefault();
    }
    if (e.code === 'ArrowDown') {
      tryHop(0, -1);
      e.preventDefault();
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      tryHop(-1, 0);
      e.preventDefault();
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      tryHop(1, 0);
      e.preventDefault();
    }
  };

  // ==================== Update ====================

  const updatePlayer = (dt: number) => {
    if (player.isDead) return;

    if (player.isHopping) {
      player.hopProgress += dt / HOP_DURATION;
      if (player.hopProgress >= 1) {
        player.hopProgress = 1;
        player.isHopping = false;
        player.x = player.targetX;
        player.y = player.targetY;

        // Landing dust particles
        spawnParticles(player.x + CELL_SIZE / 2, player.y + CELL_SIZE, 4, {
          colors: ['#9ca3af', '#6b7280', '#d4d4d4'],
          speedMin: 10,
          speedMax: 40,
          sizeMin: 2,
          sizeMax: 3,
          lifeMin: 0.15,
          lifeMax: 0.4,
          gravity: 80,
          directionBias: { x: 0, y: 10 },
        });

        // Check landing collisions
        checkLandingCollision();
      } else {
        // Interpolate position from stored start
        const t = player.hopProgress;
        player.x = player.hopStartX + (player.targetX - player.hopStartX) * t;
        player.y = player.hopStartY + (player.targetY - player.hopStartY) * t;
      }
    } else {
      player.y = -player.rowIndex * CELL_SIZE;

      // If on river, ride platform (don't snap x to grid)
      const currentRow = getRowByIndex(player.rowIndex);
      if (currentRow && currentRow.type === 'river') {
        const platform = getPlayerPlatform(currentRow);
        if (platform) {
          const dirSign = platform.direction === 'right' ? 1 : -1;
          player.x += platform.speed * dirSign * dt;
          player.col = Math.round((player.x - offsetX) / CELL_SIZE);
        }
      } else {
        // Snap to grid on non-river rows
        player.x = colToX(player.col, offsetX);
      }
    }
  };

  const getPlayerPlatform = (row: TRow) => {
    const px = player.x + PLAYER_HITBOX_SHRINK;
    const pw = CELL_SIZE - PLAYER_HITBOX_SHRINK * 2;
    const py = row.worldY;

    for (const entity of row.entities) {
      const ey = row.worldY;
      if (
        rectRectHit(px, py, pw, CELL_SIZE, entity.x, ey, entity.width, entity.height)
      ) {
        return entity;
      }
    }
    return null;
  };

  const checkLandingCollision = () => {
    if (player.isDead) return;

    const currentRow = getRowByIndex(player.rowIndex);
    if (!currentRow) return;

    const px = player.x + PLAYER_HITBOX_SHRINK;
    const pw = CELL_SIZE - PLAYER_HITBOX_SHRINK * 2;
    const py = player.y;
    const ph = CELL_SIZE;

    if (currentRow.type === 'road') {
      for (const entity of currentRow.entities) {
        const ey = currentRow.worldY;
        if (rectRectHit(px, py, pw, ph, entity.x, ey, entity.width, entity.height)) {
          killPlayer('vehicle');
          return;
        }
      }
    }

    if (currentRow.type === 'railway') {
      for (const entity of currentRow.entities) {
        const ey = currentRow.worldY;
        if (rectRectHit(px, py, pw, ph, entity.x, ey, entity.width, entity.height)) {
          killPlayer('train');
          return;
        }
      }
    }

    if (currentRow.type === 'river') {
      const platform = getPlayerPlatform(currentRow);
      if (!platform) {
        killPlayer('drown');
        return;
      }
    }
  };

  const checkContinuousCollision = () => {
    if (player.isDead || player.isHopping) return;

    const currentRow = getRowByIndex(player.rowIndex);
    if (!currentRow) return;

    const px = player.x + PLAYER_HITBOX_SHRINK;
    const pw = CELL_SIZE - PLAYER_HITBOX_SHRINK * 2;
    const py = player.y;
    const ph = CELL_SIZE;

    // Road vehicles
    if (currentRow.type === 'road') {
      for (const entity of currentRow.entities) {
        const ey = currentRow.worldY;
        if (rectRectHit(px, py, pw, ph, entity.x, ey, entity.width, entity.height)) {
          killPlayer('vehicle');
          return;
        }
      }
    }

    // Railway train
    if (currentRow.type === 'railway') {
      for (const entity of currentRow.entities) {
        const ey = currentRow.worldY;
        if (rectRectHit(px, py, pw, ph, entity.x, ey, entity.width, entity.height)) {
          killPlayer('train');
          return;
        }
      }
    }

    // River - check if still on platform
    if (currentRow.type === 'river') {
      const platform = getPlayerPlatform(currentRow);
      if (!platform) {
        killPlayer('drown');
        return;
      }
      // Check if pushed offscreen
      if (player.x + CELL_SIZE < offsetX || player.x > offsetX + playfieldWidth) {
        killPlayer('offscreen');
        return;
      }
    }
  };

  // ==================== Particle System ====================

  const spawnParticles = (
    x: number,
    y: number,
    count: number,
    options: {
      colors: string[];
      speedMin?: number;
      speedMax?: number;
      sizeMin?: number;
      sizeMax?: number;
      lifeMin?: number;
      lifeMax?: number;
      gravity?: number;
      directionBias?: { x: number; y: number };
    },
  ) => {
    const {
      colors,
      speedMin = 30,
      speedMax = 120,
      sizeMin = 2,
      sizeMax = 5,
      lifeMin = 0.3,
      lifeMax = 0.8,
      gravity = PARTICLE_GRAVITY,
      directionBias,
    } = options;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = speedMin + Math.random() * (speedMax - speedMin);
      let vx = Math.cos(angle) * speed;
      let vy = Math.sin(angle) * speed;

      if (directionBias) {
        vx += directionBias.x;
        vy += directionBias.y;
      }

      const life = lifeMin + Math.random() * (lifeMax - lifeMin);

      particles.push({
        x,
        y,
        vx,
        vy,
        life,
        maxLife: life,
        size: sizeMin + Math.random() * (sizeMax - sizeMin),
        color: colors[Math.floor(Math.random() * colors.length)],
        gravity,
      });
    }
  };

  const updateParticles = (dt: number) => {
    for (const p of particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);
  };

  const renderParticles = () => {
    for (const p of particles) {
      const screenY = worldToScreenY(p.y, cameraY);
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, screenY, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  // ==================== Death System ====================

  const killPlayer = (type?: TDeathType) => {
    if (player.isDead) return;

    const deathType = type ?? 'vehicle';
    player.isDead = true;
    player.deathType = deathType;
    deathTimer = DEATH_ANIM_DURATION;
    deathAnimProgress = 0;

    const px = player.x + CELL_SIZE / 2;
    const py = player.y + CELL_SIZE / 2;

    // Spawn death particles based on type
    switch (deathType) {
      case 'vehicle':
        spawnParticles(px, py, 10, {
          colors: ['#ef4444', '#f97316', '#fbbf24', '#fef08a'],
          speedMin: 60,
          speedMax: 180,
          sizeMin: 3,
          sizeMax: 6,
          lifeMin: 0.4,
          lifeMax: 1.0,
        });
        break;
      case 'train':
        spawnParticles(px, py, 10, {
          colors: ['#9ca3af', '#fbbf24', '#d4d4d4', '#6b7280'],
          speedMin: 80,
          speedMax: 200,
          sizeMin: 3,
          sizeMax: 6,
          lifeMin: 0.4,
          lifeMax: 1.0,
        });
        break;
      case 'drown':
        spawnParticles(px, py, 8, {
          colors: ['#93c5fd', '#bfdbfe', '#ffffff', '#60a5fa'],
          speedMin: 30,
          speedMax: 80,
          sizeMin: 3,
          sizeMax: 5,
          lifeMin: 0.4,
          lifeMax: 0.9,
          gravity: -100,
          directionBias: { x: 0, y: -60 },
        });
        break;
      case 'offscreen':
        spawnParticles(px, py, 5, {
          colors: ['#ffffff', '#e5e7eb', '#fbbf24'],
          speedMin: 10,
          speedMax: 40,
          sizeMin: 2,
          sizeMax: 4,
          lifeMin: 0.6,
          lifeMax: 1.2,
          gravity: 40,
        });
        break;
    }
  };

  const updateEntities = (dt: number) => {
    for (const row of rows) {
      if (row.type === 'road') {
        updateRoadRow(row, dt);
      } else if (row.type === 'railway') {
        updateRailwayRow(row, dt);
      } else if (row.type === 'river') {
        updateRiverRow(row, dt);
      }
    }
  };

  const updateRoadRow = (row: TRow, dt: number) => {
    const dirSign = row.direction === 'right' ? 1 : -1;

    // Move entities
    for (const entity of row.entities) {
      entity.x += entity.speed * dirSign * dt;
    }

    // Remove offscreen
    row.entities = row.entities.filter(
      (e) => !isEntityOffscreen(e, playfieldWidth, offsetX),
    );

    // Spawn timer
    row.spawnTimer -= dt;
    if (row.spawnTimer <= 0) {
      row.spawnTimer = row.spawnInterval;

      // Check minimum gap with nearest vehicle at spawn edge
      let canSpawn = true;
      if (row.entities.length > 0) {
        const spawnEdge =
          row.direction === 'right' ? offsetX : offsetX + playfieldWidth;

        for (const e of row.entities) {
          const entityEdge =
            row.direction === 'right' ? e.x + e.width : e.x;
          const gap = Math.abs(entityEdge - spawnEdge);
          if (gap < VEHICLE_MIN_GAP + e.width) {
            canSpawn = false;
            break;
          }
        }
      }

      if (canSpawn) {
        const vehicle = spawnVehicle(row, playfieldWidth, offsetX);
        if (vehicle) row.entities.push(vehicle);
      }
    }
  };

  const updateRailwayRow = (row: TRow, dt: number) => {
    if (row.trainCooldown > 0) {
      // Cooldown phase
      row.trainCooldown -= dt;
      if (row.trainCooldown <= 0) {
        row.warningActive = true;
        row.warningTimer = WARNING_DURATION;
      }
    } else if (row.warningActive) {
      // Warning phase
      row.warningTimer -= dt;
      if (row.warningTimer <= 0) {
        row.warningActive = false;
        // Spawn train
        const dirSign = row.direction === 'right' ? 1 : -1;
        const startX =
          row.direction === 'right'
            ? offsetX - TRAIN_WIDTH
            : offsetX + playfieldWidth;

        row.entities.push({
          x: startX,
          width: TRAIN_WIDTH,
          height: TRAIN_HEIGHT,
          speed: TRAIN_SPEED,
          direction: row.direction,
          type: 'train',
          color: '#555555',
        });
      }
    } else {
      // Move train
      const dirSign = row.direction === 'right' ? 1 : -1;
      for (const entity of row.entities) {
        entity.x += entity.speed * dirSign * dt;
      }

      // Remove offscreen trains, reset cooldown
      const before = row.entities.length;
      row.entities = row.entities.filter(
        (e) => !isEntityOffscreen(e, playfieldWidth, offsetX),
      );
      if (before > 0 && row.entities.length === 0) {
        const difficulty = getDifficulty(score);
        row.trainCooldown =
          3 + Math.random() * 4 / (0.5 + difficulty * 0.5);
        row.trainPassed = true;
      }
    }
  };

  const updateRiverRow = (row: TRow, dt: number) => {
    const dirSign = row.direction === 'right' ? 1 : -1;

    // Move entities
    for (const entity of row.entities) {
      entity.x += entity.speed * dirSign * dt;
    }

    // Remove offscreen
    row.entities = row.entities.filter(
      (e) => !isEntityOffscreen(e, playfieldWidth, offsetX),
    );

    // Spawn timer
    row.spawnTimer -= dt;
    if (row.spawnTimer <= 0) {
      row.spawnTimer = row.spawnInterval;
      row.entities.push(spawnLogOrLilypad(row, playfieldWidth, offsetX));
    }
  };

  const updateCamera = (dt: number) => {
    const rect = canvas.getBoundingClientRect();
    const targetPlayerScreenY = rect.height * CAMERA_TARGET_Y_RATIO;

    // Target camera so player is at 65% height
    const newTargetCameraY = player.y - targetPlayerScreenY;

    // Camera only moves up (more negative)
    if (newTargetCameraY < targetCameraY) {
      targetCameraY = newTargetCameraY;
    }

    // Smooth lerp
    cameraY += (targetCameraY - cameraY) * CAMERA_SMOOTH_SPEED * dt;

    // Deadline push (screen bottom moves up slowly)
    const difficulty = getDifficulty(score);
    const pushSpeed = CAMERA_PUSH_SPEED_BASE * (0.5 + difficulty * 0.5);
    deadlineY -= pushSpeed * dt;

    // Check if player is below deadline
    if (player.y > deadlineY && !player.isDead) {
      killPlayer('offscreen');
    }

    // Generate & cleanup rows
    generateRows();
    cleanupRows();

    // Init river entities for newly visible rows
    for (const row of rows) {
      if (row.type === 'river' && !row.initialSpawned) {
        spawnInitialRiverEntities(row, playfieldWidth, offsetX);
      }
    }
  };

  const update = (t: number) => {
    if (isPaused) return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);

    if (isStarted && !isGameOver) {
      updatePlayer(dt);
      updateEntities(dt);
      checkContinuousCollision();
      updateCamera(dt);

      // Death animation timer
      if (player.isDead && deathTimer > 0) {
        deathTimer -= dt;
        deathAnimProgress = 1 - deathTimer / DEATH_ANIM_DURATION;
        if (deathTimer <= 0) {
          deathTimer = 0;
          deathAnimProgress = 1;
          isGameOver = true;
        }
      }
    }

    // Always update particles (even during death animation)
    updateParticles(dt);
  };

  // ==================== Render ====================

  const renderRow = (row: TRow) => {
    const rect = canvas.getBoundingClientRect();
    const screenY = worldToScreenY(row.worldY, cameraY);

    // Skip if offscreen
    if (screenY + CELL_SIZE < 0 || screenY > rect.height) return;

    // Background
    switch (row.type) {
      case 'grass':
        renderGrassRow(row, screenY);
        break;
      case 'road':
        renderRoadRow(row, screenY);
        break;
      case 'railway':
        renderRailwayRow(row, screenY);
        break;
      case 'river':
        renderRiverRow(row, screenY);
        break;
    }
  };

  const renderGrassRow = (row: TRow, screenY: number) => {
    const rect = canvas.getBoundingClientRect();

    // Green background
    ctx.fillStyle = row.index % 2 === 0 ? '#4ade80' : '#22c55e';
    ctx.fillRect(0, screenY, rect.width, CELL_SIZE);

    // Obstacles
    for (const obs of row.obstacles) {
      const ox = colToX(obs.col, offsetX);
      if (obs.type === 'tree') {
        // Trunk
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(ox + 18, screenY + 20, 12, 28);
        // Canopy
        ctx.fillStyle = '#166534';
        ctx.beginPath();
        ctx.arc(ox + 24, screenY + 18, 16, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Rock
        ctx.fillStyle = '#6b7280';
        ctx.beginPath();
        ctx.ellipse(ox + 24, screenY + 28, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#9ca3af';
        ctx.beginPath();
        ctx.ellipse(ox + 22, screenY + 24, 10, 8, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  };

  const renderRoadRow = (row: TRow, screenY: number) => {
    const rect = canvas.getBoundingClientRect();

    // Gray road
    ctx.fillStyle = '#374151';
    ctx.fillRect(0, screenY, rect.width, CELL_SIZE);

    // Lane markings
    ctx.fillStyle = '#fbbf24';
    ctx.setLineDash([16, 16]);
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, screenY + CELL_SIZE / 2);
    ctx.lineTo(rect.width, screenY + CELL_SIZE / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Vehicles
    for (const entity of row.entities) {
      const ey = screenY + (CELL_SIZE - entity.height) / 2;
      ctx.fillStyle = entity.color;

      if (entity.type === 'truck') {
        // Truck body
        ctx.fillRect(entity.x, ey, entity.width, entity.height);
        // Cab
        ctx.fillStyle = '#1f2937';
        const cabX = entity.direction === 'right'
          ? entity.x + entity.width - 18
          : entity.x;
        ctx.fillRect(cabX, ey + 4, 18, entity.height - 8);
      } else {
        // Car body
        ctx.fillRect(entity.x, ey, entity.width, entity.height);
        // Windows
        ctx.fillStyle = '#93c5fd';
        const winX = entity.direction === 'right'
          ? entity.x + entity.width - 14
          : entity.x + 4;
        ctx.fillRect(winX, ey + 6, 10, entity.height - 12);
      }
    }
  };

  const renderRailwayRow = (row: TRow, screenY: number) => {
    const rect = canvas.getBoundingClientRect();
    const now = Date.now();

    // Shake offset during warning
    let shakeX = 0;
    if (row.warningActive) {
      shakeX = Math.sin(now / 50) * TRAIN_WARNING_SHAKE;
    }

    ctx.save();
    if (shakeX !== 0) {
      ctx.translate(shakeX, 0);
    }

    // Brown track background
    ctx.fillStyle = '#78350f';
    ctx.fillRect(0, screenY, rect.width, CELL_SIZE);

    // Rails
    ctx.fillStyle = '#a8a29e';
    ctx.fillRect(0, screenY + 10, rect.width, 4);
    ctx.fillRect(0, screenY + CELL_SIZE - 14, rect.width, 4);

    // Ties
    ctx.fillStyle = '#44403c';
    for (let x = 0; x < rect.width; x += 24) {
      ctx.fillRect(x, screenY + 6, 8, CELL_SIZE - 12);
    }

    ctx.restore();

    // Warning effects
    if (row.warningActive) {
      const sinVal = Math.sin(now / 100);
      const blink = sinVal > 0;

      // Red flash overlay
      const flashAlpha = Math.abs(sinVal) * 0.15;
      ctx.fillStyle = `rgba(255, 0, 0, ${flashAlpha})`;
      ctx.fillRect(0, screenY, rect.width, CELL_SIZE);

      // Warning lights (enlarged)
      if (blink) {
        // Left warning pole + light
        ctx.fillStyle = '#374151';
        ctx.fillRect(offsetX - 6, screenY + 4, 4, CELL_SIZE - 8);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(offsetX - 4, screenY + CELL_SIZE / 2, 12, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.beginPath();
        ctx.arc(offsetX - 4, screenY + CELL_SIZE / 2, 18, 0, Math.PI * 2);
        ctx.fill();

        // Right warning pole + light
        ctx.fillStyle = '#374151';
        ctx.fillRect(offsetX + playfieldWidth + 2, screenY + 4, 4, CELL_SIZE - 8);
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(offsetX + playfieldWidth + 4, screenY + CELL_SIZE / 2, 12, 0, Math.PI * 2);
        ctx.fill();
        // Glow
        ctx.fillStyle = 'rgba(239, 68, 68, 0.3)';
        ctx.beginPath();
        ctx.arc(offsetX + playfieldWidth + 4, screenY + CELL_SIZE / 2, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Direction arrows
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 18px monospace';
      ctx.textBaseline = 'middle';
      if (row.direction === 'right') {
        ctx.textAlign = 'left';
        ctx.fillText('>>>', offsetX + 8, screenY + CELL_SIZE / 2);
      } else {
        ctx.textAlign = 'right';
        ctx.fillText('<<<', offsetX + playfieldWidth - 8, screenY + CELL_SIZE / 2);
      }
    }

    // Train
    for (const entity of row.entities) {
      const ey = screenY + (CELL_SIZE - entity.height) / 2;
      ctx.fillStyle = '#555555';
      ctx.fillRect(entity.x, ey, entity.width, entity.height);
      // Front highlight
      ctx.fillStyle = '#fbbf24';
      const frontX =
        entity.direction === 'right'
          ? entity.x + entity.width - 6
          : entity.x;
      ctx.fillRect(frontX, ey + 4, 6, entity.height - 8);
    }
  };

  const renderRiverRow = (row: TRow, screenY: number) => {
    const rect = canvas.getBoundingClientRect();

    // Blue water
    ctx.fillStyle = row.index % 2 === 0 ? '#3b82f6' : '#2563eb';
    ctx.fillRect(0, screenY, rect.width, CELL_SIZE);

    // Water ripples
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    const rippleOffset = (Date.now() / 500) % 20;
    for (let x = -20 + rippleOffset; x < rect.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, screenY + CELL_SIZE / 2 - 3);
      ctx.quadraticCurveTo(x + 5, screenY + CELL_SIZE / 2 - 7, x + 10, screenY + CELL_SIZE / 2 - 3);
      ctx.stroke();
    }

    // Logs & lilypads
    for (const entity of row.entities) {
      const ey = screenY + (CELL_SIZE - entity.height) / 2;

      if (entity.type === 'log') {
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(entity.x, ey, entity.width, entity.height);
        // Bark lines
        ctx.strokeStyle = '#6d3710';
        ctx.lineWidth = 1;
        for (let lx = entity.x + 10; lx < entity.x + entity.width - 5; lx += 15) {
          ctx.beginPath();
          ctx.moveTo(lx, ey + 4);
          ctx.lineTo(lx, ey + entity.height - 4);
          ctx.stroke();
        }
        // Highlight
        ctx.fillStyle = '#a0652b';
        ctx.fillRect(entity.x + 2, ey + 2, entity.width - 4, 4);
      } else {
        // Lilypad
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.ellipse(
          entity.x + entity.width / 2,
          ey + entity.height / 2,
          entity.width / 2,
          entity.height / 2,
          0,
          0.2,
          Math.PI * 2,
        );
        ctx.fill();
        // Center vein
        ctx.strokeStyle = '#166534';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(entity.x + entity.width / 2, ey + 4);
        ctx.lineTo(entity.x + entity.width / 2, ey + entity.height - 4);
        ctx.stroke();
      }
    }
  };

  const renderPlayerNormal = (drawX: number, drawY: number) => {
    const size = CELL_SIZE;

    // Body
    ctx.fillStyle = '#fbbf24';
    ctx.fillRect(drawX + 4, drawY + 4, size - 8, size - 8);

    // Eyes
    ctx.fillStyle = 'white';
    const eyeOffsetX = player.facing === 'left' ? -4 : 4;
    ctx.fillRect(drawX + size / 2 - 8 + eyeOffsetX, drawY + 12, 7, 9);
    ctx.fillRect(drawX + size / 2 + 1 + eyeOffsetX, drawY + 12, 7, 9);

    // Pupils
    ctx.fillStyle = 'black';
    const pupilShift = player.facing === 'left' ? -1 : 1;
    ctx.fillRect(drawX + size / 2 - 6 + eyeOffsetX + pupilShift, drawY + 15, 3, 4);
    ctx.fillRect(drawX + size / 2 + 3 + eyeOffsetX + pupilShift, drawY + 15, 3, 4);

    // Beak / direction indicator
    ctx.fillStyle = '#ef4444';
    const beakX = player.facing === 'left' ? drawX + 2 : drawX + size - 10;
    ctx.fillRect(beakX, drawY + size / 2 - 2, 8, 6);

    // Feet
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(drawX + 12, drawY + size - 6, 6, 6);
    ctx.fillRect(drawX + size - 18, drawY + size - 6, 6, 6);
  };

  const renderPlayer = () => {
    // During death animation, render with effects
    if (player.isDead && !isGameOver) {
      const screenY = worldToScreenY(player.y, cameraY);
      const drawX = player.x;
      const centerX = drawX + CELL_SIZE / 2;
      const centerY = screenY + CELL_SIZE / 2;
      const t = deathAnimProgress; // 0→1

      ctx.save();

      switch (player.deathType) {
        case 'vehicle': {
          // Flatten: scaleY 1→0.2, scaleX 1→1.5
          const scaleX = 1 + t * 0.5;
          const scaleY = 1 - t * 0.8;
          ctx.translate(centerX, centerY);
          ctx.scale(scaleX, scaleY);
          ctx.translate(-centerX, -centerY);
          ctx.globalAlpha = 1 - t * 0.3;
          renderPlayerNormal(drawX, screenY);
          break;
        }
        case 'train': {
          // Fly away in train direction with rotation
          const currentRow = getRowByIndex(player.rowIndex);
          const dir = currentRow?.direction === 'left' ? -1 : 1;
          const flyX = dir * t * 300;
          const rotation = dir * t * Math.PI * 2;
          ctx.translate(centerX + flyX, centerY - t * 50);
          ctx.rotate(rotation);
          ctx.translate(-centerX, -centerY);
          ctx.globalAlpha = 1 - t;
          renderPlayerNormal(drawX, screenY);
          break;
        }
        case 'drown': {
          // Sink down + fade out
          const sinkY = t * 30;
          ctx.globalAlpha = 1 - t * 0.9;
          const scaleD = 1 - t * 0.3;
          ctx.translate(centerX, centerY + sinkY);
          ctx.scale(scaleD, scaleD);
          ctx.translate(-centerX, -centerY - sinkY);
          renderPlayerNormal(drawX, screenY + sinkY);
          break;
        }
        case 'offscreen': {
          // Float up + shrink
          const riseY = -t * 60;
          const scaleO = 1 - t * 0.6;
          ctx.translate(centerX, centerY + riseY);
          ctx.scale(scaleO, scaleO);
          ctx.translate(-centerX, -centerY - riseY);
          ctx.globalAlpha = 1 - t;
          renderPlayerNormal(drawX, screenY + riseY);
          break;
        }
        default:
          renderPlayerNormal(drawX, screenY);
      }

      ctx.restore();
      return;
    }

    // Already game over, don't render player
    if (player.isDead) return;

    const screenY = worldToScreenY(player.y, cameraY);
    let drawY = screenY;

    // Hop arc
    if (player.isHopping) {
      drawY += hopArcOffset(player.hopProgress, HOP_ARC_HEIGHT);
    }

    renderPlayerNormal(player.x, drawY);
  };

  const renderScore = () => {
    const rect = canvas.getBoundingClientRect();

    // Shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(`${score}`, rect.width / 2 + 2, 22);

    // Main text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`${score}`, rect.width / 2, 20);
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();

    // Clear
    ctx.fillStyle = '#87CEEB'; // sky blue fallback
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Render rows back to front (lowest index first = bottom)
    const sortedRows = [...rows].sort((a, b) => a.index - b.index);
    for (const row of sortedRows) {
      renderRow(row);
    }

    renderPlayer();
    renderParticles();
    renderScore();
  };

  const drawHud = () => {
    if (!isStarted && !isGameOver) {
      gameStartHud(canvas, ctx);
      return;
    }

    if (isGameOver) {
      gameOverHud.render(Math.floor(score));
      return;
    }

    if (isPaused) {
      gamePauseHud(canvas, ctx, { showRestartHint: true });
      return;
    }
  };

  // ==================== Game Loop ====================

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHud();

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  resize();
  window.addEventListener('keydown', onKeyDown);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
  };
};
