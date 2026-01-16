"use client";

import { Enemy, Player, Point } from "@/@types/dodge";
import { useEffect, useRef } from "react";
import {
  circleCircleCollide,
  ENEMY_RADIUS,
  ENEMY_SPAWN_INTERVAL_MS,
  getDifficulty,
  getEnemySpeedRange,
  getSpawnInterval,
  pickDir,
  PLAYER_RADIUS,
  PLAYER_SPEED,
  SCORE_PER_SEC,
  spawnOutsideByDir,
} from "./_lib/utils";

function DodgePage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const keysRef = useRef({
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
  });

  const playerRef = useRef<Point>({ x: 80, y: 80 });
  const enemiesRef = useRef<Enemy[]>([]);
  const enemyIdRef = useRef(1);

  const lastTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0); // 살아 남은 시간
  const scoreRef = useRef<number>(0);
  const spawnAccRef = useRef<number>(0); // 스폰 누적 타이머
  const isGameOverRef = useRef<boolean>(false);
  const isStartedRef = useRef<boolean>(false);

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

      playerRef.current = {
        x: rect.width / 2,
        y: rect.height / 2,
      };
    };

    const startGame = () => {
      if (isStartedRef.current) return;
      isStartedRef.current = true;
      lastTimeRef.current = 0;
    };

    const resetGame = () => {
      isGameOverRef.current = false;
      elapsedRef.current = 0;
      scoreRef.current = 0;
      spawnAccRef.current = 0;
      enemiesRef.current = [];

      const rect = canvas.getBoundingClientRect();
      playerRef.current = {
        x: rect.width / 2,
        y: rect.height / 2,
      };

      lastTimeRef.current = 0;
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

    const updatePlayer = (dt: number) => {
      const rect = canvas.getBoundingClientRect();
      const p = playerRef.current;

      let dx = 0;
      let dy = 0;
      if (keysRef.current.ArrowLeft) dx -= 1;
      if (keysRef.current.ArrowRight) dx += 1;
      if (keysRef.current.ArrowUp) dy -= 1;
      if (keysRef.current.ArrowDown) dy += 1;

      // 대각선 보정(안 하면 대각선이 더 빠름)
      if (dx !== 0 && dy !== 0) {
        const inv = 1 / Math.sqrt(2);
        dx *= inv;
        dy *= inv;
      }

      p.x += dx * PLAYER_SPEED * dt;
      p.y += dy * PLAYER_SPEED * dt;

      p.x = Math.max(PLAYER_RADIUS, Math.min(rect.width - PLAYER_RADIUS, p.x));
      p.y = Math.max(PLAYER_RADIUS, Math.min(rect.height - PLAYER_RADIUS, p.y));
    };

    const drawPlayer = () => {
      const p = playerRef.current;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = "black";
      ctx.fill();
    };

    const spawnEnemy = () => {
      if (!isStartedRef.current || isGameOverRef.current) return;

      const rect = canvas.getBoundingClientRect();

      const dir = pickDir(); // 8방향 고정(대각선 정규화 포함)
      const { min, max } = getEnemySpeedRange(elapsedRef.current);
      const speed = min + Math.random() * (max - min);

      const { x, y } = spawnOutsideByDir(rect, ENEMY_RADIUS, dir);

      enemiesRef.current.push({
        id: enemyIdRef.current++,
        x,
        y,
        r: ENEMY_RADIUS,
        speed,
        vx: dir.vx,
        vy: dir.vy,
      });
    };

    const trySpawnEnemies = (dt: number) => {
      spawnAccRef.current += dt;

      const interval = getSpawnInterval(elapsedRef.current);

      // 한 프레임이 길어졌을 때도 스폰을 놓치지 않도록 while
      while (spawnAccRef.current >= interval) {
        spawnAccRef.current -= interval;
        spawnEnemy(); // 아래 spawnEnemy는 속도 범위를 elapsed 기반으로 계산
      }
    };

    const updateEnemies = (dt: number) => {
      const rect = canvas.getBoundingClientRect();
      for (const e of enemiesRef.current) {
        e.x += e.vx * e.speed * dt;
        e.y += e.vy * e.speed * dt;
      }

      const isOutside = (e: Enemy) => {
        const m = e.r + 2;
        return (
          e.x < -m || e.x > rect.width + m || e.y < -m || e.y > rect.height + m
        );
      };

      enemiesRef.current = enemiesRef.current.filter((e) => !isOutside(e));
    };

    const drawEnemies = () => {
      for (const e of enemiesRef.current) {
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2);
        ctx.fillStyle = "red";
        ctx.fill();
      }
    };

    const checkCollision = () => {
      const p = playerRef.current;
      for (const e of enemiesRef.current) {
        if (circleCircleCollide(p.x, p.y, PLAYER_RADIUS, e.x, e.y, e.r)) {
          // 난이도 조절 -> 나든 적이든 r 값 줄이면 히트박스 작아짐
          return true;
        }
      }
      return false;
    };

    const updateScore = (dt: number) => {
      scoreRef.current += SCORE_PER_SEC * dt;
    };

    const drawHud = () => {
      const rect = canvas.getBoundingClientRect();

      if (!isStartedRef.current) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,1)";
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.fillStyle = "white";
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Press 'S' for start", rect.width / 2, rect.height / 2);
        ctx.restore();
        return; // 혹은 여기서 끝내기
      }

      const time = elapsedRef.current;
      const score = Math.floor(scoreRef.current);
      const d = getDifficulty(time);

      ctx.font = "16px sans-serif";
      ctx.fillStyle = "black";
      ctx.textAlign = "left";
      ctx.fillText(`Time: ${time.toFixed(1)}s`, 12, 22);
      ctx.fillText(`Score: ${score}`, 12, 44);
      ctx.fillText(`Difficulty: ${Math.round(d * 100)}%`, 12, 66);
      ctx.restore();

      if (!isGameOverRef.current) return;

      ctx.save();

      ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
      ctx.fillRect(0, 0, rect.width, rect.height);

      const cardW = Math.min(520, rect.width * 0.85);
      const cardH = Math.min(260, rect.height * 0.45);
      const cardX = (rect.width - cardW) / 2;
      const cardY = (rect.height - cardH) / 2;

      ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
      ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
      ctx.lineWidth = 2;

      ctx.fillStyle = "black";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const cx = rect.width / 2;
      const baseY = cardY + cardH / 2;

      ctx.font = "52px sans-serif";
      ctx.fillText("GAME OVER", cx, baseY - 40);

      ctx.font = "22px sans-serif";
      ctx.fillText(`Score: ${score}`, cx, baseY + 18);

      ctx.font = "18px sans-serif";
      ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
      ctx.fillText("Press R for Restart", cx, baseY + 58);

      ctx.restore();
    };

    resize();

    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    let raf = 0;
    const draw = (t: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = t;
      let dt = (t - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = t;

      // 탭 전환/렉 등으로 dt가 너무 커지는 것 방지
      dt = Math.min(dt, 0.05); // 최대 50ms

      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      if (isStartedRef.current && !isGameOverRef.current) {
        elapsedRef.current += dt;
        updateScore(dt);

        updatePlayer(dt);
        trySpawnEnemies(dt);
        updateEnemies(dt);

        if (checkCollision()) {
          isGameOverRef.current = true;
        }
      }

      drawPlayer();
      drawEnemies();
      drawHud(); // 아래 참고

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
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
