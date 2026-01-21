"use client";
import { useEffect, useRef } from "react";
import { setupTetris } from "../_lib/game";

function Tetris() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    return setupTetris(canvas);
  }, []);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full max-w-[500px] h-full border touch-none mx-auto" />
    </div>
  );
}

export default Tetris;