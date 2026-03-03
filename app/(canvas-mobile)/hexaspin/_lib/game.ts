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
  CENTER_X,
  CENTER_Y,
  HEX_SIDES,
  HEX_RADIUS,
  PLAYER_DISTANCE,
  PLAYER_SIZE,
  PLAYER_SPEED,
  WALL_THICKNESS,
  WALL_SPAWN_DISTANCE,
  PHASES,
  PALETTES,
  SCORE_PER_SEC,
  PATTERN_GAP,
} from './config';
import { TWall, TGameState } from './types';
import { PATTERNS } from './patterns';

export type TSuperHexagonCallbacks = {
  onGameStart?: () => Promise<void>;
  onScoreSave: (score: number) => Promise<TSaveResult>;
  isLoggedIn: boolean;
};

export function setupSuperHexagon(
  canvas: HTMLCanvasElement,
  callbacks: TSuperHexagonCallbacks,
): () => void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  // --- 게임 상태 ---
  let state: TGameState = 'start';
  let score = 0;
  let sec = 0;
  let lastTime = 0;

  // 플레이어 (각도로만 이동)
  let playerAngle = -Math.PI / 2; // 12시 방향에서 시작

  // 맵 회전
  let mapRotation = 0;
  let rotationDirection = 1;
  let rotationSwitchTimer = 0;
  let rotationSwitchThreshold = 3 + Math.random() * 4;

  // 벽
  let walls: TWall[] = [];
  let nextSpawnDistance = WALL_SPAWN_DISTANCE;

  // 시각 효과
  let pulsePhase = 0;
  let currentPaletteKey = 'cyan';

  // 입력 상태
  const keys = { left: false, right: false };
  let touchLeft = false;
  let touchRight = false;

  // --- Game Over HUD ---
  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (finalScore) => {
      return callbacks.onScoreSave(finalScore);
    },
    onRestart: () => {
      resetGame();
    },
  };

  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'superhexagon',
    gameOverCallbacks,
    { isLoggedIn: callbacks.isLoggedIn },
  );

  // --- 초기화 ---
  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(CANVAS_WIDTH * dpr);
    canvas.height = Math.round(CANVAS_HEIGHT * dpr);
    canvas.style.width = `${CANVAS_WIDTH}px`;
    canvas.style.height = `${CANVAS_HEIGHT}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    resetGame();
  };

  const resetGame = () => {
    state = 'start';
    score = 0;
    sec = 0;
    lastTime = 0;
    playerAngle = -Math.PI / 2;
    mapRotation = 0;
    rotationDirection = 1;
    rotationSwitchTimer = 0;
    walls = [];
    nextSpawnDistance = WALL_SPAWN_DISTANCE;
    pulsePhase = 0;
    currentPaletteKey = 'cyan';
    keys.left = false;
    keys.right = false;
    touchLeft = false;
    touchRight = false;
    gameOverHud.reset();
  };

  const startGame = async () => {
    if (state === 'playing' || state === 'loading') return;
    state = 'loading';
    if (callbacks.onGameStart) {
      await callbacks.onGameStart();
    }
    state = 'playing';
    lastTime = 0;
    sec = 0;
    score = 0;
    walls = [];
    nextSpawnDistance = WALL_SPAWN_DISTANCE;
    playerAngle = -Math.PI / 2;
    mapRotation = 0;
    rotationDirection = 1;
    rotationSwitchTimer = 0;
    rotationSwitchThreshold = 3 + Math.random() * 4;
    pulsePhase = 0;
    currentPaletteKey = 'cyan';
    keys.left = false;
    keys.right = false;
    touchLeft = false;
    touchRight = false;
  };

  // --- 난이도 ---
  const getCurrentPhase = () => {
    let phase: (typeof PHASES)[number] = PHASES[0];
    for (const p of PHASES) {
      if (sec >= p.time) phase = p;
    }
    return phase;
  };

  // --- 패턴 스폰 ---
  const spawnPattern = () => {
    const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    const baseDistance = nextSpawnDistance;

    for (const w of pattern.walls) {
      walls.push({
        side: w.side,
        distance: baseDistance + w.offset,
        thickness: WALL_THICKNESS,
      });
    }

    // 패턴 내 최대 offset 찾아서 다음 스폰 거리 결정
    const maxOffset = Math.max(...pattern.walls.map((w) => w.offset));
    nextSpawnDistance = baseDistance + maxOffset + WALL_THICKNESS + PATTERN_GAP;
  };

  // --- 업데이트 ---
  const update = (t: number) => {
    if (state !== 'playing') return;

    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;
    dt = Math.min(dt, 0.05);

    sec += dt;
    score += SCORE_PER_SEC * dt;

    const phase = getCurrentPhase();
    currentPaletteKey = phase.palette;

    // 플레이어 이동
    const moving = keys.left || keys.right || touchLeft || touchRight;
    if (moving) {
      let dir = 0;
      if (keys.left || touchLeft) dir -= 1;
      if (keys.right || touchRight) dir += 1;
      playerAngle += dir * PLAYER_SPEED * dt;
    }

    // 각도 정규화
    playerAngle = ((playerAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    // 맵 회전
    mapRotation += rotationDirection * phase.rotSpeed * dt;
    rotationSwitchTimer += dt;
    if (rotationSwitchTimer > rotationSwitchThreshold) {
      rotationDirection *= -1;
      rotationSwitchTimer = 0;
      rotationSwitchThreshold = 3 + Math.random() * 4;
    }

    // 벽 이동
    for (const wall of walls) {
      wall.distance -= phase.wallSpeed * dt;
    }

    // 화면 밖(중앙 도달) 벽 제거
    walls = walls.filter((w) => w.distance + w.thickness > HEX_RADIUS * 0.5);

    // 새 패턴 스폰 — 가장 먼 벽이 임계치 이하이면
    const farthest = walls.length > 0 ? Math.max(...walls.map((w) => w.distance)) : 0;
    if (farthest < WALL_SPAWN_DISTANCE || walls.length === 0) {
      nextSpawnDistance = Math.max(farthest + PATTERN_GAP, WALL_SPAWN_DISTANCE);
      spawnPattern();
    }

    // 충돌 감지
    if (checkCollision()) {
      state = 'gameover';
    }

    // 펄스
    pulsePhase += dt * 3;
  };

  // --- 충돌 감지 ---
  const checkCollision = (): boolean => {
    const sectorAngle = (Math.PI * 2) / HEX_SIDES;

    // playerAngle은 맵 로컬 좌표 (렌더링에서 ctx.rotate(mapRotation) 안에서
    // playerAngle 그대로 사용하므로, 맵 로컬 = playerAngle)
    // 벽도 맵 로컬 좌표이므로 직접 비교 가능
    const pAngle = ((playerAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);

    for (const wall of walls) {
      // 벽이 플레이어 거리 범위에 있는지
      const wallInner = wall.distance;
      const wallOuter = wall.distance + wall.thickness;
      const playerInner = PLAYER_DISTANCE - PLAYER_SIZE * 0.5;
      const playerOuter = PLAYER_DISTANCE + PLAYER_SIZE * 0.5;

      if (wallInner <= playerOuter && wallOuter >= playerInner) {
        // 벽의 각도 범위
        const wallStartAngle = wall.side * sectorAngle;
        const wallEndAngle = (wall.side + 1) * sectorAngle;

        // 플레이어 각도가 벽의 각도 범위에 있는지
        if (isAngleInRange(pAngle, wallStartAngle, wallEndAngle)) {
          return true;
        }
      }
    }
    return false;
  };

  const isAngleInRange = (angle: number, start: number, end: number): boolean => {
    const TWO_PI = Math.PI * 2;
    const a = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
    const s = ((start % TWO_PI) + TWO_PI) % TWO_PI;
    const e = ((end % TWO_PI) + TWO_PI) % TWO_PI;

    // 플레이어 크기를 각도 margin으로 변환 (벽 가장자리에서의 관대한 판정)
    const margin = PLAYER_SIZE * 0.3 / PLAYER_DISTANCE; // 약 3.3도

    const sM = s + margin;
    const eM = e - margin;

    if (sM < eM) {
      return a >= sM && a <= eM;
    }
    // wrap around (일반적으로 hexagon에서는 발생 안하지만 안전 처리)
    return a >= sM || a <= eM;
  };

  // --- 렌더링 ---
  const render = () => {
    const palette = PALETTES[currentPaletteKey] || PALETTES.cyan;

    // 배경 전체 지우기
    ctx.fillStyle = palette.bg1;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.save();
    ctx.translate(CENTER_X, CENTER_Y);
    ctx.rotate(mapRotation);

    // 배경 방사형 삼각형
    drawBackground(palette);

    // 벽 그리기
    drawWalls(palette);

    // 중앙 헥사곤
    drawHexagon(palette);

    ctx.restore();

    // 플레이어 (맵 회전 적용)
    ctx.save();
    ctx.translate(CENTER_X, CENTER_Y);
    ctx.rotate(mapRotation);
    drawPlayer(palette);
    ctx.restore();

    // HUD (회전 영향 없음)
    if (state === 'playing') {
      drawGameHud();
    }
  };

  const drawBackground = (palette: typeof PALETTES.cyan) => {
    const sectorAngle = (Math.PI * 2) / HEX_SIDES;
    const maxRadius = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let i = 0; i < HEX_SIDES; i++) {
      const startAngle = i * sectorAngle;
      const endAngle = (i + 1) * sectorAngle;

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(
        Math.cos(startAngle) * maxRadius,
        Math.sin(startAngle) * maxRadius,
      );
      ctx.lineTo(
        Math.cos(endAngle) * maxRadius,
        Math.sin(endAngle) * maxRadius,
      );
      ctx.closePath();
      ctx.fillStyle = i % 2 === 0 ? palette.bg1 : palette.bg2;
      ctx.fill();
    }
  };

  const drawHexagon = (palette: typeof PALETTES.cyan) => {
    const pulse = 1 + Math.sin(pulsePhase) * 0.05;
    const r = HEX_RADIUS * pulse;
    const sectorAngle = (Math.PI * 2) / HEX_SIDES;

    ctx.beginPath();
    for (let i = 0; i < HEX_SIDES; i++) {
      const angle = i * sectorAngle;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = palette.bg1;
    ctx.fill();
    ctx.strokeStyle = palette.hex;
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  const drawWalls = (palette: typeof PALETTES.cyan) => {
    const sectorAngle = (Math.PI * 2) / HEX_SIDES;

    for (const wall of walls) {
      if (wall.distance < HEX_RADIUS * 0.5) continue;

      const startAngle = wall.side * sectorAngle;
      const endAngle = (wall.side + 1) * sectorAngle;
      const innerR = Math.max(wall.distance, HEX_RADIUS);
      const outerR = wall.distance + wall.thickness;

      // 사다리꼴 벽
      ctx.beginPath();
      ctx.moveTo(Math.cos(startAngle) * innerR, Math.sin(startAngle) * innerR);
      ctx.lineTo(Math.cos(startAngle) * outerR, Math.sin(startAngle) * outerR);
      ctx.lineTo(Math.cos(endAngle) * outerR, Math.sin(endAngle) * outerR);
      ctx.lineTo(Math.cos(endAngle) * innerR, Math.sin(endAngle) * innerR);
      ctx.closePath();

      ctx.fillStyle = wall.side % 2 === 0 ? palette.wall1 : palette.wall2;
      ctx.fill();
    }
  };

  const drawPlayer = (palette: typeof PALETTES.cyan) => {
    // playerAngle은 화면 기준 절대 각도. ctx가 mapRotation만큼 회전된 상태이므로
    // playerAngle 그대로 사용하면 화면에서 올바른 위치에 렌더링됨.
    // 충돌 감지는 (playerAngle - mapRotation)으로 맵 로컬 좌표 변환 후 비교.
    const px = Math.cos(playerAngle) * PLAYER_DISTANCE;
    const py = Math.sin(playerAngle) * PLAYER_DISTANCE;

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(playerAngle + Math.PI / 2);

    // 정삼각형 (꼭짓점이 바깥을 향함, 무게중심 기준)
    const h = PLAYER_SIZE * Math.sqrt(3); // 정삼각형 높이
    ctx.beginPath();
    ctx.moveTo(0, -h * 2 / 3);
    ctx.lineTo(-PLAYER_SIZE, h / 3);
    ctx.lineTo(PLAYER_SIZE, h / 3);
    ctx.closePath();
    ctx.fillStyle = palette.player;
    ctx.fill();

    ctx.restore();
  };

  const drawGameHud = () => {
    const timeStr = sec.toFixed(1) + 's';
    const scoreStr = Math.floor(score).toString();

    ctx.save();
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`TIME: ${timeStr}`, 16, 16);
    ctx.fillText(`SCORE: ${scoreStr}`, 16, 40);

    // 현재 난이도 표시
    const phase = getCurrentPhase();
    ctx.textAlign = 'right';
    ctx.font = 'bold 14px monospace';
    ctx.fillStyle = PALETTES[phase.palette]?.wall1 || '#fff';
    const phaseNames = ['EASY', 'NORMAL', 'HARD', 'HARDER', 'HARDEST'];
    const phaseIndex = PHASES.indexOf(phase);
    ctx.fillText(phaseNames[phaseIndex] || 'HARDEST', CANVAS_WIDTH - 16, 16);
    ctx.restore();
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
    if (state === 'gameover') {
      gameOverHud.render(score);
      return;
    }
    if (state === 'paused') {
      gamePauseHud(canvas, ctx);
      return;
    }
  };

  // --- 키보드 이벤트 (e.code 필수!) ---
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;

    if (e.code === 'KeyS') {
      if (state === 'paused') {
        state = 'playing';
        lastTime = 0;
        return;
      }
      if (state === 'start') {
        startGame();
      }
      return;
    }

    if (e.code === 'KeyP' && state === 'playing') {
      state = 'paused';
      return;
    }

    if (state === 'gameover') {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    if (e.code === 'KeyR') {
      resetGame();
      return;
    }

    if (state !== 'playing') return;

    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keys.left = true;
      e.preventDefault();
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keys.right = true;
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
      keys.left = false;
      e.preventDefault();
    }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') {
      keys.right = false;
      e.preventDefault();
    }
  };

  // --- 터치 이벤트 ---
  // 캔버스 내부 좌표 변환 (게임 오버 HUD 버튼 등에 사용)
  const getTouchPos = (touch: Touch) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (touch.clientX - rect.left) * scaleX,
      y: (touch.clientY - rect.top) * scaleY,
    };
  };

  // 모바일 CSS rotate(90deg) 감지: 캔버스의 rect 비율로 판단
  const isRotated = () => {
    const rect = canvas.getBoundingClientRect();
    // 논리 크기는 800x500(가로>세로)인데, 화면에서 세로>가로이면 회전된 상태
    return rect.height > rect.width * 1.2;
  };

  // 게임 플레이 중 터치 방향 판단 (화면 좌표 기준)
  const getTouchDirection = (touch: Touch): 'left' | 'right' => {
    if (isRotated()) {
      // 모바일(90도 회전 상태): 화면 위쪽=반시계, 아래쪽=시계
      const rect = canvas.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      return touch.clientY < midY ? 'left' : 'right';
    }
    // 데스크탑: 캔버스 좌반=반시계, 우반=시계
    const pos = getTouchPos(touch);
    return pos.x < CANVAS_WIDTH / 2 ? 'left' : 'right';
  };

  const handleTouchStart = (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    if (!touch) return;

    // 게임 시작 전이면 터치로 시작
    if (state === 'start') {
      startGame();
      return;
    }

    // 일시정지 상태이면 터치로 재개
    if (state === 'paused') {
      state = 'playing';
      lastTime = 0;
      return;
    }

    // 게임 오버: 터치로 SAVE/SKIP/재시작 처리
    if (state === 'gameover') {
      const pos = getTouchPos(touch);
      const handled = gameOverHud.onTouchStart(pos.x, pos.y, score);
      if (handled) return;
      return;
    }

    // 플레이 중: 방향 판단
    if (state === 'playing') {
      const dir = getTouchDirection(touch);
      if (dir === 'left') touchLeft = true;
      else touchRight = true;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    e.preventDefault();
    if (state !== 'playing') return;

    touchLeft = false;
    touchRight = false;
    for (let i = 0; i < e.touches.length; i++) {
      const dir = getTouchDirection(e.touches[i]);
      if (dir === 'left') touchLeft = true;
      else touchRight = true;
    }
  };

  const handleTouchEnd = (e: TouchEvent) => {
    e.preventDefault();
    touchLeft = false;
    touchRight = false;
    for (let i = 0; i < e.touches.length; i++) {
      const dir = getTouchDirection(e.touches[i]);
      if (dir === 'left') touchLeft = true;
      else touchRight = true;
    }
  };

  // 마우스 이벤트 (데스크탑 터치 대안)
  let mouseDown = false;
  const handleMouseDown = (e: MouseEvent) => {
    if (state === 'start') {
      startGame();
      return;
    }
    if (state === 'paused') {
      state = 'playing';
      lastTime = 0;
      return;
    }
    if (state === 'gameover') {
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const scaleY = CANVAS_HEIGHT / rect.height;
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      const handled = gameOverHud.onTouchStart(x, y, score);
      if (handled) return;
      return;
    }
    if (state === 'playing') {
      mouseDown = true;
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_WIDTH / rect.width;
      const x = (e.clientX - rect.left) * scaleX;
      if (x < CANVAS_WIDTH / 2) {
        touchLeft = true;
      } else {
        touchRight = true;
      }
    }
  };

  const handleMouseUp = () => {
    mouseDown = false;
    touchLeft = false;
    touchRight = false;
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!mouseDown || state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const x = (e.clientX - rect.left) * scaleX;
    touchLeft = x < CANVAS_WIDTH / 2;
    touchRight = x >= CANVAS_WIDTH / 2;
  };

  // --- 게임 루프 ---
  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHud();
    raf = requestAnimationFrame(draw);
  };

  // --- 이벤트 리스너 등록 ---
  resize();
  raf = requestAnimationFrame(draw);

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd);
  canvas.addEventListener('mousedown', handleMouseDown);
  canvas.addEventListener('mouseup', handleMouseUp);
  canvas.addEventListener('mousemove', handleMouseMove);

  // --- Cleanup ---
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    canvas.removeEventListener('touchstart', handleTouchStart);
    canvas.removeEventListener('touchmove', handleTouchMove);
    canvas.removeEventListener('touchend', handleTouchEnd);
    canvas.removeEventListener('mousedown', handleMouseDown);
    canvas.removeEventListener('mouseup', handleMouseUp);
    canvas.removeEventListener('mousemove', handleMouseMove);
  };
}
