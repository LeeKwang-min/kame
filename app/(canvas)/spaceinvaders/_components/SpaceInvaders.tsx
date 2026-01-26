'use client';
import { useEffect, useRef } from 'react';
import { setupSpaceInvaders } from '../_lib/game';

function SpaceInvaders() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    return setupSpaceInvaders(canvas);
  }, []);

  return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );
}

export default SpaceInvaders;
