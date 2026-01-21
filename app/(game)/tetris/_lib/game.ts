import { drawHud } from "@/lib/game";
import { TBoard, TTetromino, TTetrominoType } from "./types";
import { BASE_STEP } from "./config";

export const setupTetris = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // ==================== State ====================

  const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  };

  let board: TBoard;
  let current: TTetromino;
  let next: TTetrominoType;

  // let level = 1;
  // let lines = 0;
  // let step = BASE_STEP

  let score = 0;
  let isStarted = false;
  let isGameOver = false;

  let lastTime = 0;
  let acc = 0;  // tick용 누적 시간 (snake 같은 고정 스텝 게임에서 사용)
  let sec = 0;  // 총 경과 시간

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
    if (e.code === "KeyS") {
      startGame();
      return;
    }

    if (e.code === "KeyR") {
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
    ctx.fillStyle = "limegreen";
    ctx.fill();
  };

  const render = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    // TODO: render 함수들 호출
    renderPoint();
  };

  // ==================== Game Loop ====================

  let raf = 0;
  const draw = (t: number) => {
    update(t);
    render();
    drawHud(canvas, ctx, score, sec, isStarted, isGameOver);

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  resize();
  window.addEventListener("resize", resize);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  };
};