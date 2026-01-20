"use client";
import { useEffect, useRef } from "react";
import { setupFlappyBird } from "../_lib/game";

function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    return setupFlappyBird(canvas);
  }, []);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default FlappyBird;