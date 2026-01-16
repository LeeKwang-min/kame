"use client";

import { MapState, Point } from "@/@types/kero";
import { useEffect, useRef } from "react";
import { MAP_SIZE, PLAYER_DIR, PLAYER_DIR_KEYS } from "./_lib/utils";

function KeroPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerPosRef = useRef<Point>({ x: 0, y: 0 });
  const mapRef = useRef<MapState[][]>(
    Array.from({ length: MAP_SIZE }, () =>
      Array.from({ length: MAP_SIZE }, () => "safe")
    )
  );

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

      playerPosRef.current = {
        x: Math.floor(MAP_SIZE / 2),
        y: Math.floor(MAP_SIZE / 2),
      };
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (PLAYER_DIR_KEYS.includes(e.key as keyof typeof PLAYER_DIR)) {
        playerPosRef.current = {
          x:
            playerPosRef.current.x +
            PLAYER_DIR[e.key as keyof typeof PLAYER_DIR].x,
          y:
            playerPosRef.current.y +
            PLAYER_DIR[e.key as keyof typeof PLAYER_DIR].y,
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
          ctx.fillStyle = "white";
          ctx.strokeStyle = "black";
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
      ctx.fillStyle = "black";
      ctx.fillRect(
        playerPosRef.current.x * cellSize + cellSize * 0.1,
        playerPosRef.current.y * cellSize + cellSize * 0.1,
        cellSize * 0.8,
        cellSize * 0.8
      );
      ctx.restore();
    };

    const updatePlayer = () => {
      const rect = canvas.getBoundingClientRect();
      const cellSize = rect.width / MAP_SIZE;

      const x = playerPosRef.current.x * cellSize + cellSize * 0.1;
      const y = playerPosRef.current.y * cellSize + cellSize * 0.1;

      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        playerPosRef.current = {
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

    window.addEventListener("resize", resize);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  return (
    <section className="w-full h-full flex justify-center items-center">
      <div className="w-[600px] h-[600px]">
        <canvas
          ref={canvasRef}
          className="w-full h-full border border-black touch-none"
        />
      </div>
    </section>
  );
}

export default KeroPage;
