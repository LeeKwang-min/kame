import {
  createGameOverHud,
  gameHud,
  gameStartHud,
  TGameOverCallbacks,
} from '@/lib/game';

// ==================== Types ====================
// TODO: 게임에 맞게 TGameType을 변경하세요 (예: 'dodge', 'snake' 등)
// @types/scores.ts에 새 게임 타입을 추가해야 합니다.

export type TTemplateCallbacks = {
  onScoreSave: (initials: string, score: number) => Promise<void>;
};

// ==================== Setup ====================

export const setupTemplate = (
  canvas: HTMLCanvasElement,
  callbacks?: TTemplateCallbacks,
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // ==================== State ====================

  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  };

  let score = 0;
  let isStarted = false;
  let isGameOver = false;

  let lastTime = 0;
  let acc = 0; // tick용 누적 시간 (snake 같은 고정 스텝 게임에서 사용)
  let sec = 0; // 총 경과 시간

  // ==================== Game Over HUD ====================

  const gameOverCallbacks: TGameOverCallbacks = {
    onScoreSave: async (initials, finalScore) => {
      if (callbacks?.onScoreSave) {
        await callbacks.onScoreSave(initials, finalScore);
      }
    },
    onRestart: () => {
      resetGame();
    },
  };

  // TODO: 'template'을 실제 게임 타입으로 변경하세요
  const gameOverHud = createGameOverHud(
    canvas,
    ctx,
    'dodge', // TODO: TGameType으로 변경 (예: 'snake', 'tetris' 등)
    gameOverCallbacks,
  );

  // ==================== Game State ====================

  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;
    acc = 0;
    sec = 0;
  };

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();

    isStarted = false;
    isGameOver = false;
    score = 0;
    lastTime = 0;
    acc = 0;
    sec = 0;
    gameOverHud.reset();

    // TODO: 게임 오브젝트 초기화
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

  // ==================== Input Handlers ====================

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'KeyS') {
      startGame();
      return;
    }

    // 게임 오버 상태에서는 GameOverHud가 키 입력 처리
    if (isGameOver) {
      const handled = gameOverHud.onKeyDown(e, score);
      if (handled) return;
    }

    // 게임 진행 중에만 R키로 리셋 가능
    if (e.code === 'KeyR' && !isGameOver) {
      resetGame();
      return;
    }

    if (e.key in keys) {
      keys[e.key as keyof typeof keys] = true;
      e.preventDefault();
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key in keys) {
      keys[e.key as keyof typeof keys] = false;
      e.preventDefault();
    }
  };

  // ==================== Update Functions ====================

  // TODO: 각 오브젝트별 update 함수 작성
  // const updatePlayer = (dt: number) => { ... }
  // const updateEnemies = (dt: number) => { ... }

  // TODO: 충돌 처리 함수 작성
  // const handleCollision = (): boolean => { ... }

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    acc += dt;
    sec += dt;

    if (isStarted && !isGameOver) {
      // TODO: update 함수들 호출
      // updatePlayer(dt);
      // updateEnemies(dt);
      // if (handleCollision()) isGameOver = true;
    }
  };

  // ==================== Render Functions ====================

  // TODO: 각 오브젝트별 render 함수 작성
  // const renderPlayer = () => { ... }
  // const renderEnemies = () => { ... }

  const renderPoint = () => {
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = 'limegreen';
    ctx.fill();
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // TODO: render 함수들 호출
    renderPoint();
  };

  // ==================== HUD ====================

  const drawHud = () => {
    if (!isStarted) {
      gameStartHud(canvas, ctx);
      return;
    }

    if (isGameOver) {
      gameOverHud.render(score);
      return;
    }

    gameHud(ctx, score, sec);
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
  window.addEventListener('resize', resize);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
  };
};
