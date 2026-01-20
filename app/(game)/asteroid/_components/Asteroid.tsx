"use client";
import { useEffect, useRef } from "react";
import { setupAsteroid } from "../_lib/game";

function Asteroid() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    return setupAsteroid(canvas);
  }, []);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default Asteroid;