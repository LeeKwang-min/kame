import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  BUBBLE_RADIUS,
  BUBBLE_SPEED,
  GRID_COLS,
  INITIAL_ROWS,
  BUBBLE_COLORS,
  SCORE_PER_POP,
  SCORE_PER_DROP,
  COMBO_MULTIPLIER,
  CLEAR_BONUS,
  MISS_LIMIT,
  DEADLINE_Y,
  LAUNCHER_Y,
  LAUNCHER_X,
  POP_ANIMATION_DURATION,
  DROP_GRAVITY,
  AIM_LINE_LENGTH,
  MIN_ANGLE,
  MAX_ANGLE,
} from './config';
import {
  TShootingBubble,
  TDroppingBubble,
  TPoppingBubble,
  TFloatingText,
  TParticle,
} from './types';
import {
  hexToWorld,
  worldToHex,
  getMaxCol,
  getNeighborOffsets,
  bfsSameColor,
  bfsFromCeiling,
} from './utils';

export type TBubbleShooterCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupBubbleShooter = (
  canvas: HTMLCanvasElement,
  callbacks?: TBubbleShooterCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // --- State ---
  let grid: Map<string, string> = new Map(); // "row,col" -> color
  let shootingBubble: TShootingBubble | null = null;
  let droppingBubbles: TDroppingBubble[] = [];
  let poppingBubbles: TPoppingBubble[] = [];
  let floatingTexts: TFloatingText[] = [];
  let particles: TParticle[] = [];

  // Wobble animation: "row,col" -> { phase, amplitude }
  let wobbleMap: Map<string, { phase: number; amplitude: number }> = new Map();

  let score = 0;
  let comboCount = 0;
  let missCount = 0;
  let ceilingOffset = 0; // how many rows the ceiling has descended
  let gridParity = 0; // tracks parity offset for hex grid after ceiling descends

  let currentColor = '';
  let nextColor = '';
  let aimAngle = Math.PI / 2; // straight up

  let isStarted = false;
  let isLoading = false;
  let isGameOver = false;
  let isPaused = false;

  let lastTime = 0;
  let animationId = 0;

  // Mouse position for aiming
  let mouseX = LAUNCHER_X;
  let mouseY = LAUNCHER_Y - 100;

  // --- Game Over HUD ---
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

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'bubbleshooter',
    gameOverCallbacks,
    {
      isLoggedIn: callbacks?.isLoggedIn ?? false,
    },
  );

  // --- Helpers ---
  const rand = (min: number, max: number) =>
    min + Math.random() * (max - min);

  const randomColor = () =>
    BUBBLE_COLORS[Math.floor(Math.random() * BUBBLE_COLORS.length)];

  const pickColorFromGrid = (): string => {
    const colorsInGrid = new Set<string>(grid.values());
    if (colorsInGrid.size === 0) return randomColor();
    const arr = Array.from(colorsInGrid);
    return arr[Math.floor(Math.random() * arr.length)];
  };

  // --- Grid Init ---
  const initGrid = () => {
    grid.clear();
    for (let row = 0; row < INITIAL_ROWS; row++) {
      const maxCol = getMaxCol(row, gridParity);
      for (let col = 0; col <= maxCol; col++) {
        const key = `${row},${col}`;
        grid.set(key, randomColor());
      }
    }
  };

  // --- Get world position with ceiling offset ---
  const getWorldPos = (row: number, col: number) => {
    const pos = hexToWorld(row, col, gridParity);
    pos.y += ceilingOffset * BUBBLE_RADIUS * Math.sqrt(3);
    return pos;
  };

  // --- Snap bubble to grid ---
  const snapToGrid = (wx: number, wy: number): { row: number; col: number } => {
    // Adjust for ceiling offset
    const adjustedY = wy - ceilingOffset * BUBBLE_RADIUS * Math.sqrt(3);
    const result = worldToHex(wx, adjustedY, gridParity);
    return result;
  };

  // --- Check if any grid bubble is past deadline ---
  const checkDeadline = (): boolean => {
    for (const [key] of grid) {
      const [r, c] = key.split(',').map(Number);
      const pos = getWorldPos(r, c);
      if (pos.y + BUBBLE_RADIUS >= DEADLINE_Y) {
        return true;
      }
    }
    return false;
  };

  // --- Shoot ---
  const shoot = () => {
    if (shootingBubble || isGameOver || !isStarted || isPaused) return;

    const vx = Math.cos(aimAngle) * BUBBLE_SPEED;
    const vy = -Math.sin(aimAngle) * BUBBLE_SPEED;

    shootingBubble = {
      x: LAUNCHER_X,
      y: LAUNCHER_Y,
      vx,
      vy,
      color: currentColor,
    };

    currentColor = nextColor;
    nextColor = pickColorFromGrid();
  };

  // --- Process match after snap ---
  const processMatch = (row: number, col: number) => {
    const key = `${row},${col}`;
    const color = grid.get(key);
    if (!color) return;

    // BFS same color
    const matched = bfsSameColor(row, col, color, grid, gridParity);

    if (matched.length >= 3) {
      // Pop matched bubbles
      comboCount++;
      const multiplier = comboCount > 1 ? Math.pow(COMBO_MULTIPLIER, comboCount - 1) : 1;
      const popScore = Math.floor(matched.length * SCORE_PER_POP * multiplier);

      for (const mk of matched) {
        const [mr, mc] = mk.split(',').map(Number);
        const pos = getWorldPos(mr, mc);
        poppingBubbles.push({
          x: pos.x,
          y: pos.y,
          color: grid.get(mk)!,
          scale: 1,
          alpha: 1,
          life: POP_ANIMATION_DURATION,
        });
        // Spawn particles
        spawnParticles(pos.x, pos.y, grid.get(mk)!);
        grid.delete(mk);
      }

      score += popScore;

      // Floating text for pop
      const avgPos = matched.reduce(
        (acc, mk) => {
          const [mr, mc] = mk.split(',').map(Number);
          const pos = getWorldPos(mr, mc);
          return { x: acc.x + pos.x, y: acc.y + pos.y };
        },
        { x: 0, y: 0 },
      );
      avgPos.x /= matched.length;
      avgPos.y /= matched.length;

      let text = `+${popScore}`;
      if (comboCount > 1) {
        text = `COMBO x${comboCount}! +${popScore}`;
      }

      floatingTexts.push({
        x: avgPos.x,
        y: avgPos.y - 20,
        text,
        alpha: 1,
        color: comboCount > 1 ? '#00ff88' : '#ffffff',
        life: 1.5,
      });

      // Check for orphaned bubbles
      const connected = bfsFromCeiling(grid, gridParity);
      const orphaned: string[] = [];
      for (const [gk] of grid) {
        if (!connected.has(gk)) {
          orphaned.push(gk);
        }
      }

      if (orphaned.length > 0) {
        const dropScore = Math.floor(orphaned.length * SCORE_PER_DROP * multiplier);
        score += dropScore;

        for (const ok of orphaned) {
          const [or, oc] = ok.split(',').map(Number);
          const pos = getWorldPos(or, oc);
          droppingBubbles.push({
            x: pos.x,
            y: pos.y,
            vy: 0,
            color: grid.get(ok)!,
            alpha: 1,
          });
          grid.delete(ok);
        }

        floatingTexts.push({
          x: CANVAS_WIDTH / 2,
          y: avgPos.y + 20,
          text: `DROP +${dropScore}`,
          alpha: 1,
          color: '#ffdd00',
          life: 1.5,
        });
      }

      // Check if board is cleared
      if (grid.size === 0) {
        score += CLEAR_BONUS;
        floatingTexts.push({
          x: CANVAS_WIDTH / 2,
          y: CANVAS_HEIGHT / 2,
          text: `CLEAR! +${CLEAR_BONUS}`,
          alpha: 1,
          color: '#ff00ff',
          life: 2,
        });
        // Respawn grid
        gridParity = 0;
        initGrid();
        ceilingOffset = 0;
        missCount = 0;
      }

      // Reset miss count on successful match
      missCount = 0;
    } else {
      // No match - miss
      comboCount = 0;
      missCount++;

      if (missCount >= MISS_LIMIT) {
        missCount = 0;
        descendCeiling();
      }
    }
  };

  // --- Descend ceiling ---
  const descendCeiling = () => {
    // Move all bubbles down by adding a new row at top
    const newGrid = new Map<string, string>();

    // Shift all existing bubbles down by 1 row
    for (const [key, color] of grid) {
      const [r, c] = key.split(',').map(Number);
      newGrid.set(`${r + 1},${c}`, color);
    }

    // Increment gridParity so effective parity of shifted rows is preserved
    gridParity++;

    // Add new row at row 0 with correct parity
    const maxCol = getMaxCol(0, gridParity);
    for (let col = 0; col <= maxCol; col++) {
      newGrid.set(`0,${col}`, randomColor());
    }

    grid = newGrid;

    // Check deadline
    if (checkDeadline()) {
      triggerGameOver();
    }
  };

  // --- Spawn particles ---
  const spawnParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 6; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(40, 120);
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.6,
        maxLife: 0.6,
        size: rand(2, 4),
        color,
        gravity: 200,
      });
    }
  };

  // --- Reset ---
  const resetGame = () => {
    grid.clear();
    shootingBubble = null;
    droppingBubbles = [];
    poppingBubbles = [];
    floatingTexts = [];
    particles = [];
    wobbleMap.clear();
    score = 0;
    comboCount = 0;
    missCount = 0;
    ceilingOffset = 0;
    gridParity = 0;
    currentColor = '';
    nextColor = '';
    aimAngle = Math.PI / 2;
    isStarted = false;
    isLoading = false;
    isGameOver = false;
    isPaused = false;
    gameOverHud.reset();
  };

  // --- Start ---
  const startGame = async () => {
    if (isStarted || isLoading) return;
    isLoading = true;
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    isLoading = false;
    isStarted = true;
    isGameOver = false;
    isPaused = false;
    score = 0;
    comboCount = 0;
    missCount = 0;
    ceilingOffset = 0;
    gridParity = 0;
    shootingBubble = null;
    droppingBubbles = [];
    poppingBubbles = [];
    floatingTexts = [];
    particles = [];
    wobbleMap.clear();
    initGrid();
    currentColor = pickColorFromGrid();
    nextColor = pickColorFromGrid();
  };

  const triggerGameOver = () => {
    isGameOver = true;
    isStarted = false;
  };

  // --- Update ---
  const update = (dt: number) => {
    if (!isStarted || isPaused) return;

    // Update aim angle based on mouse position
    const dx = mouseX - LAUNCHER_X;
    const dy = LAUNCHER_Y - mouseY;
    aimAngle = Math.atan2(dy, dx);
    aimAngle = Math.max(MIN_ANGLE, Math.min(MAX_ANGLE, aimAngle));

    // Update shooting bubble
    if (shootingBubble) {
      shootingBubble.x += shootingBubble.vx * dt;
      shootingBubble.y += shootingBubble.vy * dt;

      // Wall reflection
      if (shootingBubble.x - BUBBLE_RADIUS <= 0) {
        shootingBubble.x = BUBBLE_RADIUS;
        shootingBubble.vx = -shootingBubble.vx;
      }
      if (shootingBubble.x + BUBBLE_RADIUS >= CANVAS_WIDTH) {
        shootingBubble.x = CANVAS_WIDTH - BUBBLE_RADIUS;
        shootingBubble.vx = -shootingBubble.vx;
      }

      // Ceiling collision
      if (shootingBubble.y - BUBBLE_RADIUS <= 0) {
        shootingBubble.y = BUBBLE_RADIUS;
        const sx = shootingBubble.x;
        const sy = shootingBubble.y;
        const { row, col } = snapToGrid(sx, sy);
        landBubble(row, col, shootingBubble.color, sx, sy);
        shootingBubble = null;
        return;
      }

      // Grid bubble collision
      let collided = false;
      for (const [key] of grid) {
        const [r, c] = key.split(',').map(Number);
        const pos = getWorldPos(r, c);
        const dist = Math.hypot(
          shootingBubble.x - pos.x,
          shootingBubble.y - pos.y,
        );
        if (dist < BUBBLE_RADIUS * 2 - 2) {
          // Snap to nearest empty hex (pass shoot position for distance-aware placement)
          const sx = shootingBubble.x;
          const sy = shootingBubble.y;
          const { row, col } = snapToGrid(sx, sy);
          landBubble(row, col, shootingBubble.color, sx, sy);
          shootingBubble = null;
          collided = true;
          break;
        }
      }

      if (collided) return;
    }

    // Update dropping bubbles
    for (let i = droppingBubbles.length - 1; i >= 0; i--) {
      const b = droppingBubbles[i];
      b.vy += DROP_GRAVITY * dt;
      b.y += b.vy * dt;
      b.alpha -= dt * 1.5;
      if (b.y > CANVAS_HEIGHT + 50 || b.alpha <= 0) {
        droppingBubbles.splice(i, 1);
      }
    }

    // Update popping bubbles
    for (let i = poppingBubbles.length - 1; i >= 0; i--) {
      const p = poppingBubbles[i];
      p.life -= dt * 1000;
      const progress = 1 - p.life / POP_ANIMATION_DURATION;
      p.scale = 1 + progress * 0.5;
      p.alpha = 1 - progress;
      if (p.life <= 0) {
        poppingBubbles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const ft = floatingTexts[i];
      ft.y -= 40 * dt;
      ft.life -= dt;
      ft.alpha = Math.max(0, ft.life);
      if (ft.life <= 0) {
        floatingTexts.splice(i, 1);
      }
    }

    // Update particles
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.vy += p.gravity * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
      }
    }

    // Update wobble
    for (const [key, w] of wobbleMap) {
      w.phase += dt * 18; // oscillation speed
      w.amplitude *= Math.pow(0.04, dt); // exponential decay
      if (w.amplitude < 0.1) {
        wobbleMap.delete(key);
      }
    }
  };

  // --- Land bubble on grid ---
  const landBubble = (
    row: number,
    col: number,
    color: string,
    shootX?: number,
    shootY?: number,
  ) => {
    // Clamp col
    const maxCol = getMaxCol(row, gridParity);
    const clampedCol = Math.max(0, Math.min(col, maxCol));

    // If cell is occupied, find nearest empty
    let targetRow = row;
    let targetCol = clampedCol;
    const targetKey = `${targetRow},${targetCol}`;

    if (grid.has(targetKey)) {
      // Try to find an empty neighbor (distance-aware if shoot position provided)
      const found = findNearestEmpty(row, clampedCol, shootX, shootY);
      if (found) {
        targetRow = found.row;
        targetCol = found.col;
      } else {
        // No space - game over
        triggerGameOver();
        return;
      }
    }

    grid.set(`${targetRow},${targetCol}`, color);

    // Trigger wobble on landed bubble and its neighbors
    triggerWobble(targetRow, targetCol);

    // Check deadline after placing
    if (checkDeadline()) {
      triggerGameOver();
      return;
    }

    processMatch(targetRow, targetCol);
  };

  // --- Find nearest empty hex cell (distance-aware) ---
  const findNearestEmpty = (
    row: number,
    col: number,
    shootX?: number,
    shootY?: number,
  ): { row: number; col: number } | null => {
    // BFS level-by-level; collect all empty cells at same BFS depth
    // and pick the one closest to the shooting bubble's world position
    const visited = new Set<string>();
    let currentLevel: [number, number][] = [[row, col]];
    visited.add(`${row},${col}`);

    while (currentLevel.length > 0) {
      const emptyCells: { row: number; col: number }[] = [];
      const nextLevel: [number, number][] = [];

      for (const [r, c] of currentLevel) {
        const offsets = getNeighborOffsets(r, gridParity);

        for (const [dr, dc] of offsets) {
          const nr = r + dr;
          const nc = c + dc;
          const nk = `${nr},${nc}`;
          if (nr < 0 || nc < 0 || nc > getMaxCol(nr, gridParity)) continue;
          if (visited.has(nk)) continue;
          visited.add(nk);

          if (!grid.has(nk)) {
            emptyCells.push({ row: nr, col: nc });
          } else {
            nextLevel.push([nr, nc]);
          }
        }
      }

      if (emptyCells.length > 0) {
        if (shootX !== undefined && shootY !== undefined && emptyCells.length > 1) {
          // Pick the cell whose world position is closest to shoot position
          let best = emptyCells[0];
          let bestDist = Infinity;
          for (const cell of emptyCells) {
            const pos = getWorldPos(cell.row, cell.col);
            const dist = Math.hypot(shootX - pos.x, shootY - pos.y);
            if (dist < bestDist) {
              bestDist = dist;
              best = cell;
            }
          }
          return best;
        }
        return emptyCells[0];
      }

      currentLevel = nextLevel;
    }
    return null;
  };

  // --- Trigger wobble on a bubble and its neighbors ---
  const triggerWobble = (row: number, col: number) => {
    const landedKey = `${row},${col}`;
    wobbleMap.set(landedKey, { phase: 0, amplitude: 3 });

    const offsets = getNeighborOffsets(row, gridParity);

    for (const [dr, dc] of offsets) {
      const nr = row + dr;
      const nc = col + dc;
      const nk = `${nr},${nc}`;
      if (grid.has(nk)) {
        wobbleMap.set(nk, { phase: 0, amplitude: 2 });
      }
    }
  };

  // --- Render ---
  const render = () => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background
    drawBackground();

    // Deadline line
    if (isStarted || isGameOver) {
      drawDeadline();
    }

    // Grid bubbles
    for (const [key, color] of grid) {
      const [r, c] = key.split(',').map(Number);
      const pos = getWorldPos(r, c);
      const wobble = wobbleMap.get(key);
      const offsetY = wobble ? Math.sin(wobble.phase) * wobble.amplitude : 0;
      drawBubble(pos.x, pos.y + offsetY, color, 1);
    }

    // Popping bubbles
    for (const p of poppingBubbles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.translate(p.x, p.y);
      ctx.scale(p.scale, p.scale);
      drawBubbleAt(0, 0, p.color);
      ctx.restore();
    }

    // Dropping bubbles
    for (const b of droppingBubbles) {
      drawBubble(b.x, b.y, b.color, Math.max(0, b.alpha));
    }

    // Particles
    for (const p of particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Shooting bubble
    if (shootingBubble) {
      drawBubble(shootingBubble.x, shootingBubble.y, shootingBubble.color, 1);
    }

    // Launcher & Aim
    if (isStarted && !isGameOver) {
      drawLauncher();
      drawAimLine();
    }

    // Floating texts
    for (const ft of floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.fillStyle = ft.color;
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.lineWidth = 3;
      ctx.strokeText(ft.text, ft.x, ft.y);
      ctx.fillText(ft.text, ft.x, ft.y);
      ctx.restore();
    }

    // HUD
    drawHud();

    // Overlays
    if (isLoading) {
      gameLoadingHud(canvas, ctx);
    } else if (!isStarted && !isGameOver) {
      gameStartHud(canvas, ctx);
    } else if (isPaused) {
      gamePauseHud(canvas, ctx);
    } else if (isGameOver) {
      gameOverHud.render(score);
    }
  };

  // --- Draw helpers ---
  const drawBackground = () => {
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1a1a2e');
    gradient.addColorStop(0.5, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  };

  const drawDeadline = () => {
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.beginPath();
    ctx.moveTo(0, DEADLINE_Y);
    ctx.lineTo(CANVAS_WIDTH, DEADLINE_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255, 50, 50, 0.4)';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('DEADLINE', CANVAS_WIDTH - 8, DEADLINE_Y - 6);
    ctx.restore();
  };

  const drawBubble = (x: number, y: number, color: string, alpha: number) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    drawBubbleAt(x, y, color);
    ctx.restore();
  };

  const drawBubbleAt = (x: number, y: number, color: string) => {
    // Main body
    ctx.beginPath();
    ctx.arc(x, y, BUBBLE_RADIUS - 1, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(
      x - BUBBLE_RADIUS * 0.3,
      y - BUBBLE_RADIUS * 0.3,
      0,
      x,
      y,
      BUBBLE_RADIUS,
    );
    grad.addColorStop(0, lightenColor(color, 40));
    grad.addColorStop(0.7, color);
    grad.addColorStop(1, darkenColor(color, 20));
    ctx.fillStyle = grad;
    ctx.fill();

    // Outline
    ctx.strokeStyle = darkenColor(color, 30);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Highlight
    ctx.beginPath();
    ctx.arc(
      x - BUBBLE_RADIUS * 0.25,
      y - BUBBLE_RADIUS * 0.25,
      BUBBLE_RADIUS * 0.3,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fill();
  };

  const drawLauncher = () => {
    ctx.save();
    ctx.translate(LAUNCHER_X, LAUNCHER_Y);

    // Base circle
    ctx.beginPath();
    ctx.arc(0, 0, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.fill();
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Current bubble on launcher
    drawBubbleAt(0, 0, currentColor);

    // Next bubble indicator
    ctx.restore();
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('NEXT', LAUNCHER_X + 50, LAUNCHER_Y - 14);
    drawBubble(LAUNCHER_X + 50, LAUNCHER_Y + 6, nextColor, 0.8);

    // Miss counter
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`MISS: ${missCount}/${MISS_LIMIT}`, LAUNCHER_X - 55, LAUNCHER_Y + 6);

    ctx.restore();
  };

  const drawAimLine = () => {
    if (shootingBubble) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(LAUNCHER_X, LAUNCHER_Y);
    const endX = LAUNCHER_X + Math.cos(aimAngle) * AIM_LINE_LENGTH;
    const endY = LAUNCHER_Y - Math.sin(aimAngle) * AIM_LINE_LENGTH;
    ctx.lineTo(endX, endY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Aim dot
    ctx.beginPath();
    ctx.arc(endX, endY, 3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();

    ctx.restore();
  };

  const drawHud = () => {
    if (!isStarted && !isGameOver) return;

    ctx.save();

    // Score (top left)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeText(`Score: ${score}`, 12, 12);
    ctx.fillText(`Score: ${score}`, 12, 12);

    ctx.restore();
  };

  // --- Color utilities ---
  const lightenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + percent);
    const g = Math.min(255, ((num >> 8) & 0xff) + percent);
    const b = Math.min(255, (num & 0xff) + percent);
    return `rgb(${r},${g},${b})`;
  };

  const darkenColor = (hex: string, percent: number): string => {
    const num = parseInt(hex.slice(1), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - percent);
    const g = Math.max(0, ((num >> 8) & 0xff) - percent);
    const b = Math.max(0, (num & 0xff) - percent);
    return `rgb(${r},${g},${b})`;
  };

  // --- Game Loop ---
  const gameLoop = (timestamp: number) => {
    const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
    lastTime = timestamp;

    update(dt);
    render();

    animationId = requestAnimationFrame(gameLoop);
  };

  // --- Canvas position helper ---
  const getCanvasPos = (clientX: number, clientY: number) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * CANVAS_WIDTH,
      y: ((clientY - rect.top) / rect.height) * CANVAS_HEIGHT,
    };
  };

  // --- Input Handlers ---
  const handleMouseMove = (e: MouseEvent) => {
    const pos = getCanvasPos(e.clientX, e.clientY);
    mouseX = pos.x;
    mouseY = pos.y;
  };

  const handleMouseDown = (e: MouseEvent) => {
    if (isGameOver || !isStarted || isPaused) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    mouseX = pos.x;
    mouseY = pos.y;
    shoot();
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    if (isGameOver || !isStarted || isPaused) return;
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    mouseX = pos.x;
    mouseY = pos.y;
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = getCanvasPos(touch.clientX, touch.clientY);
    mouseX = pos.x;
    mouseY = pos.y;
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    if (isGameOver || !isStarted || isPaused) return;
    shoot();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    // Game over HUD handles keys first
    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    switch (e.code) {
      case 'KeyS':
        if (!isStarted && !isGameOver) {
          startGame();
        } else if (isPaused) {
          isPaused = false;
        }
        break;
      case 'KeyP':
        if (isStarted && !isGameOver) {
          isPaused = !isPaused;
        }
        break;
      case 'KeyR':
        if (!isGameOver) {
          resetGame();
        }
        break;
      case 'Space':
        if (isStarted && !isGameOver && !isPaused) {
          shoot();
        }
        break;
      case 'ArrowLeft':
        aimAngle = Math.min(MAX_ANGLE, aimAngle + 0.05);
        break;
      case 'ArrowRight':
        aimAngle = Math.max(MIN_ANGLE, aimAngle - 0.05);
        break;
    }
  };

  // --- Setup ---
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  window.addEventListener('keydown', handleKeyDown);

  lastTime = performance.now();
  animationId = requestAnimationFrame(gameLoop);

  // Cleanup
  return () => {
    cancelAnimationFrame(animationId);
    canvas.removeEventListener('mousemove', handleMouseMove);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    window.removeEventListener('keydown', handleKeyDown);
  };
};
