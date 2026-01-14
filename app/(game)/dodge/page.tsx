"use client";

import { Point } from "@/@types/canvas";
import { useEffect, useRef } from "react";

const SIZE = 10;
const SPEED = 4;

const ENEMY_SIZE = 12;
const SPAWN_INTERVAL_MS = 700;
const MIN_SPEED = 2;
const MAX_SPEED = 6;

type Enemy = {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
};

function DodgePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const pointRef = useRef<Point>({ x: 80, y: 80 });

  const keysRef = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const enemyIdRef = useRef(1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, rect.width, rect.height);

      pointRef.current = { x: rect.width / 2, y: rect.height / 2 };
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key in keysRef.current) {
        keysRef.current[e.key as keyof typeof keysRef.current] = true;
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key in keysRef.current) {
        keysRef.current[e.key as keyof typeof keysRef.current] = false;
        e.preventDefault();
      }
    };

    const updatePlayer = () => {
      const rect = canvas.getBoundingClientRect();
      let { x, y } = pointRef.current;

      if (keysRef.current.ArrowLeft) x -= SPEED;
      if (keysRef.current.ArrowRight) x += SPEED;
      if (keysRef.current.ArrowUp) y -= SPEED;
      if (keysRef.current.ArrowDown) y += SPEED;

      x = Math.max(0, Math.min(rect.width - SIZE, x));
      y = Math.max(0, Math.min(rect.height - SIZE, y));

      pointRef.current = { x, y };
    };

    const spawnEnemy = () => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();

      const x = Math.random() * (rect.width - ENEMY_SIZE);
      const speed = MIN_SPEED + Math.random() * (MAX_SPEED - MIN_SPEED);

      enemiesRef.current.push({
        id: enemyIdRef.current++,
        x,
        y: -ENEMY_SIZE,
        size: ENEMY_SIZE,
        speed,
      });
    };

    const updateEnemies = () => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();

      for (const e of enemiesRef.current) {
        e.y += e.speed;
      }

      enemiesRef.current = enemiesRef.current.filter(
        (e) => e.y < rect.height + e.size
      );
    };

    const drawEnemies = () => {
      for (const e of enemiesRef.current) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
        ctx.fillStyle = "red";
        ctx.fill();
      }
    };

    resize();

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const spawnTimer = window.setInterval(spawnEnemy, SPAWN_INTERVAL_MS);

    let raf = 0;
    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      updatePlayer();
      updateEnemies();

      const { x, y } = pointRef.current;

      ctx.beginPath();
      ctx.rect(x, y, SIZE, SIZE);
      ctx.fillStyle = "black";
      ctx.fill();

      drawEnemies();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(spawnTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <section className="w-full h-full">
      <div className="w-full h-[600px]">
        <canvas ref={canvasRef} className="w-full h-full border touch-none" />
      </div>
    </section>
  );
}

export default DodgePage;
