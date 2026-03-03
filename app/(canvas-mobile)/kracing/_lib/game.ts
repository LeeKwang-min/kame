import {
  createGameOverHud,
  gameLoadingHud,
  gameStartHud,
  gamePauseHud,
  TGameOverCallbacks,
  TSaveResult,
} from '@/lib/game';
import {
  CANVAS_SIZE,
  CAR_WIDTH,
  CAR_HEIGHT,
  MAX_SPEED,
  ACCELERATION,
  BRAKE_DECELERATION,
  NATURAL_DECELERATION,
  TURN_SPEED,
  MIN_TURN_SPEED_RATIO,
  DRIFT_TURN_MULTIPLIER,
  DRIFT_BOOST_MULTIPLIER,
  DRIFT_BOOST_DURATION,
  DRIFT_TRAIL_MAX,
  TRACK_WIDTH,
  TRACK_SEGMENTS,
  WALL_SPEED_REDUCTION,
  TOTAL_LAPS,
  COUNTDOWN_SECONDS,
  CAMERA_ZOOM,
  MINIMAP_SIZE,
  MINIMAP_MARGIN,
  COLORS,
} from './config';
import {
  TCarState,
  TDriftTrail,
  TGameState,
  TInput,
  TLapData,
} from './types';
import {
  generateTrackCenterline,
  generateTrackWalls,
  getStartLinePosition,
  findClosestSegment,
  checkWallCollision,
  checkLapCross,
} from './track';

export type TKRacingCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn?: boolean;
};

export const setupKRacing = (
  canvas: HTMLCanvasElement,
  callbacks?: TKRacingCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  // --- Track data (generated once) ---
  const centerline = generateTrackCenterline();
  const { outer: outerWall, inner: innerWall } = generateTrackWalls(centerline);
  const startPos = getStartLinePosition(centerline);

  // --- Input state ---
  const input: TInput = { left: false, right: false, brake: false };

  // --- Touch state ---
  const touches: { left: boolean; right: boolean; leftId: number | null; rightId: number | null } = {
    left: false,
    right: false,
    leftId: null,
    rightId: null,
  };

  // --- Game state ---
  let state: TGameState = 'start';
  let lastTime = 0;

  // Car
  let car: TCarState = {
    x: startPos.x,
    y: startPos.y,
    angle: startPos.angle,
    speed: 0,
    isDrifting: false,
    driftBoostTimer: 0,
  };

  // Drift trails
  let driftTrails: TDriftTrail[] = [];

  // Lap tracking
  let currentLap = 0;
  let lapTimes: TLapData[] = [];
  let totalTime = 0;
  let lapStartTime = 0;
  let prevSegIdx = 0;

  // Countdown
  let countdownTimer = 0;
  let countdownValue = COUNTDOWN_SECONDS;
  let showGo = false;
  let goTimer = 0;

  // Score for gameOverHud (total time in ms)
  let finalScore = 0;

  // --- Game Over HUD ---
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (score) => {
      if (callbacks?.onScoreSave) {
        return callbacks.onScoreSave(score);
      }
      return { saved: false };
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(canvas, ctx, 'kracing', gameOverCallbacks, {
    isLoggedIn: callbacks?.isLoggedIn ?? false,
  });

  // --- Helper: format time ---
  function formatTime(ms: number): string {
    const totalSec = ms / 1000;
    const min = Math.floor(totalSec / 60);
    const sec = Math.floor(totalSec % 60);
    const millis = Math.floor(ms % 1000);
    return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
  }

  // --- Start / Reset ---
  const startGame = async () => {
    if (state !== 'start') return;
    state = 'loading';
    if (callbacks?.onGameStart) {
      await callbacks.onGameStart();
    }
    // Begin countdown
    state = 'countdown';
    countdownTimer = 0;
    countdownValue = COUNTDOWN_SECONDS;
    showGo = false;
    goTimer = 0;
    lastTime = 0;
  };

  const resetGame = () => {
    state = 'start';
    lastTime = 0;

    // Reset car
    car = {
      x: startPos.x,
      y: startPos.y,
      angle: startPos.angle,
      speed: 0,
      isDrifting: false,
      driftBoostTimer: 0,
    };

    // Reset trails
    driftTrails = [];

    // Reset lap
    currentLap = 0;
    lapTimes = [];
    totalTime = 0;
    lapStartTime = 0;
    prevSegIdx = 0;

    // Reset countdown
    countdownTimer = 0;
    countdownValue = COUNTDOWN_SECONDS;
    showGo = false;
    goTimer = 0;

    finalScore = 0;

    // Reset input
    input.left = false;
    input.right = false;
    input.brake = false;
    touches.left = false;
    touches.right = false;
    touches.leftId = null;
    touches.rightId = null;

    gameOverHud.reset();
  };

  // --- DPR / Resize ---
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CANVAS_SIZE * dpr);
    canvas.height = Math.round(CANVAS_SIZE * dpr);
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resetGame();
  };

  // --- Keyboard events ---
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (e.code === 'KeyS') {
      if (state === 'paused') {
        state = 'racing';
        lastTime = 0;
        return;
      }
      if (state === 'start') {
        startGame();
      }
      return;
    }

    if (e.code === 'KeyP' && state === 'racing') {
      state = 'paused';
      return;
    }

    if (state === 'finished') {
      const handled = gameOverHud.onKeyDown(e, finalScore);
      if (handled) return;
    }

    if (e.code === 'KeyR' && state !== 'finished' && state !== 'paused') {
      resetGame();
      return;
    }

    if (state === 'paused') return;

    if (e.code === 'ArrowLeft') {
      input.left = true;
      e.preventDefault();
    }
    if (e.code === 'ArrowRight') {
      input.right = true;
      e.preventDefault();
    }
    if (e.code === 'Space') {
      input.brake = true;
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft') {
      input.left = false;
      e.preventDefault();
    }
    if (e.code === 'ArrowRight') {
      input.right = false;
      e.preventDefault();
    }
    if (e.code === 'Space') {
      input.brake = false;
      e.preventDefault();
    }
  };

  // --- Touch events ---
  const getTouchPos = (touch: Touch) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  const updateTouchInput = () => {
    // If both sides are touched, it's a brake
    input.brake = touches.left && touches.right;
    input.left = touches.left && !touches.right;
    input.right = touches.right && !touches.left;
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();

    // Handle state transitions first
    if (state === 'start') {
      startGame();
      return;
    }

    if (state === 'loading') return;

    if (state === 'paused') {
      state = 'racing';
      lastTime = 0;
      return;
    }

    if (state === 'finished') {
      const touch = e.changedTouches[0];
      if (!touch) return;
      const pos = getTouchPos(touch);
      const handled = gameOverHud.onTouchStart(pos.x, pos.y, finalScore);
      if (handled) return;
      return;
    }

    // Racing / countdown: register touch zones
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const pos = getTouchPos(touch);
      const halfW = CANVAS_SIZE / 2;

      if (pos.x < halfW) {
        touches.left = true;
        touches.leftId = touch.identifier;
      } else {
        touches.right = true;
        touches.rightId = touch.identifier;
      }
    }
    updateTouchInput();
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    // Touch zones are static (left/right half), so no movement handling needed
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touches.leftId) {
        touches.left = false;
        touches.leftId = null;
      }
      if (touch.identifier === touches.rightId) {
        touches.right = false;
        touches.rightId = null;
      }
    }
    updateTouchInput();
  };

  // --- Update ---
  const updateCountdown = (dt: number) => {
    if (showGo) {
      goTimer += dt;
      if (goTimer >= 0.5) {
        state = 'racing';
        totalTime = 0;
        lapStartTime = 0;
        lastTime = 0;
      }
      return;
    }

    countdownTimer += dt;
    if (countdownTimer >= 1.0) {
      countdownTimer -= 1.0;
      countdownValue--;
      if (countdownValue <= 0) {
        showGo = true;
        goTimer = 0;
      }
    }
  };

  const updateCar = (dt: number) => {
    // Determine effective turning
    const speedRatio = car.speed / MAX_SPEED;
    const turnFactor = Math.max(speedRatio, MIN_TURN_SPEED_RATIO);
    let effectiveTurnSpeed = TURN_SPEED * turnFactor;

    // Check drift conditions
    const wasDrifting = car.isDrifting;
    const canDrift = input.brake && (input.left || input.right) && car.speed > MAX_SPEED * 0.3;

    if (canDrift) {
      car.isDrifting = true;
      effectiveTurnSpeed *= DRIFT_TURN_MULTIPLIER;
    } else {
      car.isDrifting = false;
    }

    // Drift boost on release
    if (wasDrifting && !car.isDrifting) {
      car.driftBoostTimer = DRIFT_BOOST_DURATION;
    }

    // Apply turning
    if (input.left) {
      car.angle -= effectiveTurnSpeed * dt;
    }
    if (input.right) {
      car.angle += effectiveTurnSpeed * dt;
    }

    // Acceleration / braking
    if (input.brake && !car.isDrifting) {
      // Pure brake (no drift)
      car.speed -= BRAKE_DECELERATION * dt;
    } else if (input.brake && car.isDrifting) {
      // Drifting: slower deceleration
      car.speed -= NATURAL_DECELERATION * dt;
    } else {
      // Accelerate
      car.speed += ACCELERATION * dt;
    }

    // Drift boost
    if (car.driftBoostTimer > 0) {
      car.driftBoostTimer -= dt;
      car.speed = Math.min(car.speed, MAX_SPEED * DRIFT_BOOST_MULTIPLIER);
    } else {
      car.speed = Math.min(car.speed, MAX_SPEED);
    }

    // Clamp speed
    car.speed = Math.max(0, car.speed);

    // Move car
    car.x += Math.cos(car.angle) * car.speed * dt;
    car.y += Math.sin(car.angle) * car.speed * dt;

    // Wall collision
    const collision = checkWallCollision(car.x, car.y, centerline);
    if (collision.collided) {
      car.x = collision.x;
      car.y = collision.y;
      car.speed *= WALL_SPEED_REDUCTION;
    }

    // Drift trail
    if (car.isDrifting) {
      // Add trail particles at rear wheel positions
      const rearOffset = CAR_HEIGHT * 0.35;
      const sideOffset = CAR_WIDTH * 0.45;
      const cosA = Math.cos(car.angle);
      const sinA = Math.sin(car.angle);

      // Left rear
      driftTrails.push({
        x: car.x - cosA * rearOffset - sinA * sideOffset,
        y: car.y - sinA * rearOffset + cosA * sideOffset,
        alpha: 0.6,
      });
      // Right rear
      driftTrails.push({
        x: car.x - cosA * rearOffset + sinA * sideOffset,
        y: car.y - sinA * rearOffset - cosA * sideOffset,
        alpha: 0.6,
      });
    }

    // Fade drift trails
    for (let i = driftTrails.length - 1; i >= 0; i--) {
      driftTrails[i].alpha -= dt * 0.8;
      if (driftTrails[i].alpha <= 0) {
        driftTrails.splice(i, 1);
      }
    }

    // Cap trail count
    while (driftTrails.length > DRIFT_TRAIL_MAX) {
      driftTrails.shift();
    }
  };

  const updateLaps = (dt: number) => {
    totalTime += dt * 1000; // convert to ms

    const currSegIdx = findClosestSegment(car.x, car.y, centerline);

    if (checkLapCross(prevSegIdx, currSegIdx, TRACK_SEGMENTS)) {
      const lapTime = totalTime - lapStartTime;
      lapTimes.push({ time: lapTime });
      currentLap++;
      lapStartTime = totalTime;

      if (currentLap >= TOTAL_LAPS) {
        state = 'finished';
        finalScore = Math.floor(totalTime);
      }
    }

    prevSegIdx = currSegIdx;
  };

  const update = (t: number) => {
    if (state === 'paused' || state === 'start' || state === 'finished') return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;
    dt = Math.min(dt, 0.05);

    if (state === 'loading') return;

    if (state === 'countdown') {
      updateCountdown(dt);
      return;
    }

    if (state === 'racing') {
      updateCar(dt);
      updateLaps(dt);
    }
  };

  // --- Rendering ---

  const renderTrack = () => {
    // 1. Grass background (large area)
    ctx.fillStyle = COLORS.grass;
    ctx.fillRect(
      -CANVAS_SIZE, -CANVAS_SIZE,
      CANVAS_SIZE * 4, CANVAS_SIZE * 4,
    );

    // 2. Track asphalt: outer path -> inner path (reversed) -> fill
    ctx.beginPath();
    // Outer wall path
    for (let i = 0; i < outerWall.length; i++) {
      if (i === 0) ctx.moveTo(outerWall[i].x, outerWall[i].y);
      else ctx.lineTo(outerWall[i].x, outerWall[i].y);
    }
    ctx.closePath();

    // Inner wall path (reversed to cut out)
    ctx.moveTo(innerWall[0].x, innerWall[0].y);
    for (let i = innerWall.length - 1; i >= 0; i--) {
      ctx.lineTo(innerWall[i].x, innerWall[i].y);
    }
    ctx.closePath();

    ctx.fillStyle = COLORS.track;
    ctx.fill('evenodd');

    // 3. Outer wall border
    ctx.beginPath();
    for (let i = 0; i < outerWall.length; i++) {
      if (i === 0) ctx.moveTo(outerWall[i].x, outerWall[i].y);
      else ctx.lineTo(outerWall[i].x, outerWall[i].y);
    }
    ctx.closePath();
    ctx.strokeStyle = COLORS.trackBorder;
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.stroke();

    // 4. Inner wall border
    ctx.beginPath();
    for (let i = 0; i < innerWall.length; i++) {
      if (i === 0) ctx.moveTo(innerWall[i].x, innerWall[i].y);
      else ctx.lineTo(innerWall[i].x, innerWall[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // 5. Start/finish line (checkerboard)
    renderStartLine();
  };

  const renderStartLine = () => {
    const p = centerline[0];
    const next = centerline[1];
    const dx = next.x - p.x;
    const dy = next.y - p.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    // Normal perpendicular to track direction
    const nx = -dy / len;
    const ny = dx / len;

    const halfW = TRACK_WIDTH / 2;
    const checkerSize = 6;
    const numCheckers = Math.floor(TRACK_WIDTH / checkerSize);

    for (let i = 0; i < numCheckers; i++) {
      for (let j = 0; j < 2; j++) {
        const isWhite = (i + j) % 2 === 0;
        ctx.fillStyle = isWhite ? COLORS.startLine : '#222222';

        const offsetAlongNormal = -halfW + i * checkerSize;
        const offsetAlongTrack = -checkerSize + j * checkerSize;

        const cx = p.x + nx * offsetAlongNormal + (dx / len) * offsetAlongTrack;
        const cy = p.y + ny * offsetAlongNormal + (dy / len) * offsetAlongTrack;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(Math.atan2(dy, dx));
        ctx.fillRect(-checkerSize / 2, -checkerSize / 2, checkerSize, checkerSize);
        ctx.restore();
      }
    }
  };

  const renderDriftTrails = () => {
    for (const trail of driftTrails) {
      ctx.beginPath();
      ctx.arc(trail.x, trail.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(40, 40, 40, ${trail.alpha})`;
      ctx.fill();
    }
  };

  const renderCar = () => {
    ctx.save();
    ctx.translate(car.x, car.y);
    // car.angle=0 means moving right; car body is drawn facing up (-Y),
    // so rotate by +π/2 to align the visual front with movement direction.
    ctx.rotate(car.angle + Math.PI / 2);

    const halfW = CAR_WIDTH / 2;
    const halfH = CAR_HEIGHT / 2;

    // Car body
    ctx.fillStyle = COLORS.car;
    ctx.fillRect(-halfW, -halfH, CAR_WIDTH, CAR_HEIGHT);

    // Tires (4 corners)
    const tireW = 3;
    const tireH = 5;
    ctx.fillStyle = COLORS.carTire;

    // Front-left
    ctx.fillRect(-halfW - 1, -halfH, tireW, tireH);
    // Front-right
    ctx.fillRect(halfW - tireW + 1, -halfH, tireW, tireH);
    // Rear-left
    ctx.fillRect(-halfW - 1, halfH - tireH, tireW, tireH);
    // Rear-right
    ctx.fillRect(halfW - tireW + 1, halfH - tireH, tireW, tireH);

    // Windshield (at the front)
    ctx.fillStyle = COLORS.carWindshield;
    ctx.fillRect(-halfW + 2, -halfH + 2, CAR_WIDTH - 4, 5);

    ctx.restore();
  };

  const renderMinimap = () => {
    const mx = MINIMAP_MARGIN;
    const my = MINIMAP_MARGIN;

    // Background
    ctx.fillStyle = COLORS.minimap;
    ctx.fillRect(mx, my, MINIMAP_SIZE, MINIMAP_SIZE);

    // Calculate bounds of centerline for scaling
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of centerline) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const padding = 8;
    const mapW = MINIMAP_SIZE - padding * 2;
    const mapH = MINIMAP_SIZE - padding * 2;
    const scaleMap = Math.min(mapW / rangeX, mapH / rangeY);

    const offsetX = mx + padding + (mapW - rangeX * scaleMap) / 2;
    const offsetY = my + padding + (mapH - rangeY * scaleMap) / 2;

    const toMapX = (x: number) => offsetX + (x - minX) * scaleMap;
    const toMapY = (y: number) => offsetY + (y - minY) * scaleMap;

    // Draw track outline on minimap
    ctx.beginPath();
    for (let i = 0; i < centerline.length; i++) {
      const px = toMapX(centerline[i].x);
      const py = toMapY(centerline[i].y);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.strokeStyle = COLORS.minimapTrack;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw car position
    const carMX = toMapX(car.x);
    const carMY = toMapY(car.y);
    ctx.beginPath();
    ctx.arc(carMX, carMY, 3, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.minimapCar;
    ctx.fill();
  };

  const renderSpeedGauge = () => {
    const gaugeW = 120;
    const gaugeH = 12;
    const gx = CANVAS_SIZE - gaugeW - 15;
    const gy = CANVAS_SIZE - 25;

    // Background
    ctx.fillStyle = COLORS.speedGaugeBg;
    ctx.fillRect(gx, gy, gaugeW, gaugeH);

    // Speed fill
    const ratio = Math.min(car.speed / MAX_SPEED, 1);
    ctx.fillStyle = COLORS.speedGauge;
    ctx.fillRect(gx, gy, gaugeW * ratio, gaugeH);

    // Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(gx, gy, gaugeW, gaugeH);

    // Speed text
    ctx.fillStyle = COLORS.hudText;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText(`${Math.floor(car.speed)} px/s`, CANVAS_SIZE - 15, gy - 3);
  };

  const renderHudText = () => {
    // Total time (top center)
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(formatTime(totalTime), CANVAS_SIZE / 2, 12);

    // Lap (top right)
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`LAP ${Math.min(currentLap + 1, TOTAL_LAPS)}/${TOTAL_LAPS}`, CANVAS_SIZE - 15, 14);

    // Lap times (below lap counter)
    ctx.font = '12px monospace';
    ctx.textAlign = 'right';
    for (let i = 0; i < lapTimes.length; i++) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(`L${i + 1}: ${formatTime(lapTimes[i].time)}`, CANVAS_SIZE - 15, 36 + i * 16);
    }
  };

  const renderCountdown = () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.fillStyle = COLORS.countdown;
    ctx.font = 'bold 72px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (showGo) {
      ctx.fillText('GO!', CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    } else {
      ctx.fillText(String(countdownValue), CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    }
  };

  const renderTrackPreview = () => {
    // Show full track zoomed out for start screen
    ctx.save();

    // Calculate scale to fit entire track in canvas with padding
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of outerWall) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    for (const p of innerWall) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const padding = 40;
    const scalePreview = Math.min(
      (CANVAS_SIZE - padding * 2) / rangeX,
      (CANVAS_SIZE - padding * 2) / rangeY,
    );

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    ctx.scale(scalePreview, scalePreview);
    ctx.translate(-centerX, -centerY);

    renderTrack();
    renderCar();

    ctx.restore();
  };

  const render = () => {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Background
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    if (state === 'start' || state === 'loading') {
      // Show track preview
      renderTrackPreview();
      return; // HUD overlay handled in drawHud
    }

    // Camera transform: car at center of canvas
    ctx.save();
    ctx.translate(CANVAS_SIZE / 2, CANVAS_SIZE / 2);
    ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
    ctx.translate(-car.x, -car.y);

    // World-space rendering
    renderTrack();
    renderDriftTrails();
    renderCar();

    ctx.restore();
    // Screen-space rendering (HUD)

    if (state === 'racing') {
      renderMinimap();
      renderHudText();
      renderSpeedGauge();
    }

    if (state === 'countdown') {
      renderMinimap();
      renderHudText();
      renderCountdown();
    }

    if (state === 'finished') {
      renderMinimap();
      renderHudText();
    }
  };

  const drawHud = () => {
    if (state === 'start') {
      gameStartHud(canvas, ctx);
      return;
    }

    if (state === 'loading') {
      gameLoadingHud(canvas, ctx);
      return;
    }

    if (state === 'finished') {
      gameOverHud.render(finalScore);
      return;
    }

    if (state === 'paused') {
      gamePauseHud(canvas, ctx);
      return;
    }
  };

  // --- Main loop ---
  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHud();
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  // --- Init ---
  resize();
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);

  // --- Cleanup ---
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
  };
};
