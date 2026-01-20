import { drawHud } from "@/lib/game";

export const setupBase = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;


  let score = 0;
  let isStarted = false;
  let isGameOver = false;
  
  let lastTime = 0;
  let acc = 0;
  let sec = 0;

  const startGame = () => {
    if (isStarted) return;
    isStarted = true;
    lastTime = 0;
    acc = 0;
    sec = 0;
  }

  const resetGame = () => {
    const rect = canvas.getBoundingClientRect();

    isStarted = false;
    isGameOver = false;
    score = 0;
    lastTime = 0;
    acc = 0;
    sec = 0;
  }

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    resetGame();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.code === "KeyS") {
      startGame();
      return;
    }

    if (e.code === "KeyR") {
      resetGame();
      return;
    }
  };

  const renderPoint = () => {
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fillStyle = "limegreen";
    ctx.fill();
  }

  const update = (t: number) => {
    if (!lastTime) lastTime = t;
    let dt = (t - lastTime) / 1000;
    lastTime = t;

    dt = Math.min(dt, 0.05);
    acc += dt;
    sec += dt;

    if (isStarted && !isGameOver) {
      
    }
  }
  
  const render = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    renderPoint();
  }
  
  
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

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("resize", resize);
    window.removeEventListener("keydown", onKeyDown);
  }
};