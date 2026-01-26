import { MapState, Point } from './types';
import { MAP_SIZE, PLAYER_DIR, PLAYER_DIR_KEYS } from './utils';

export const setupKero33 = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let playerPos: Point = { x: 0, y: 0 };
  const map: MapState[][] = Array.from({ length: MAP_SIZE }, () =>
    Array.from({ length: MAP_SIZE }, () => 'safe'),
  );

  const resize = () => {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, rect.width, rect.height);

    playerPos = {
      x: Math.floor(MAP_SIZE / 2),
      y: Math.floor(MAP_SIZE / 2),
    };
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (PLAYER_DIR_KEYS.includes(e.key as keyof typeof PLAYER_DIR)) {
      playerPos = {
        x: playerPos.x + PLAYER_DIR[e.key as keyof typeof PLAYER_DIR].x,
        y: playerPos.y + PLAYER_DIR[e.key as keyof typeof PLAYER_DIR].y,
      };
      e.preventDefault();
    }
  };

  const drawGrid = () => {
    const rect = canvas.getBoundingClientRect();
    const cellSize = rect.width / MAP_SIZE;

    for (let x = 0; x < MAP_SIZE; x++) {
      for (let y = 0; y < MAP_SIZE; y++) {
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 1;
        ctx.strokeRect(x * cellSize, y * cellSize, cellSize, cellSize);
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        ctx.restore();
      }
    }
  };

  const drawPlayer = () => {
    const rect = canvas.getBoundingClientRect();
    const cellSize = rect.width / MAP_SIZE;

    ctx.save();
    ctx.fillStyle = 'black';
    ctx.fillRect(
      playerPos.x * cellSize + cellSize * 0.1,
      playerPos.y * cellSize + cellSize * 0.1,
      cellSize * 0.8,
      cellSize * 0.8,
    );
    ctx.restore();
  };

  const updatePlayer = () => {
    const rect = canvas.getBoundingClientRect();
    const cellSize = rect.width / MAP_SIZE;

    const x = playerPos.x * cellSize + cellSize * 0.1;
    const y = playerPos.y * cellSize + cellSize * 0.1;

    if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
      playerPos = {
        x: Math.floor(MAP_SIZE / 2),
        y: Math.floor(MAP_SIZE / 2),
      };
    }
  };

  resize();

  let raf = 0;
  const draw = () => {
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    updatePlayer();
    drawGrid();
    drawPlayer();

    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);

  window.addEventListener('resize', resize);
  window.addEventListener('keyup', onKeyUp);

  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    window.removeEventListener('keyup', onKeyUp);
  };
};
