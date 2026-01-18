"use client";
import { useEffect, useRef } from "react";
import { setupDodge } from "../_lib/game";

function Dodge() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

   return setupDodge(canvas)
  }, []);

  return (
    <div className="w-full h-[600px]">
      <canvas ref={canvasRef} className="w-full h-full border touch-none" />
    </div>
  );
}

export default Dodge;