'use client';
import { useEffect, useRef } from 'react';
import { setupPlatformer } from '../_lib/game';

function Platformer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    return setupPlatformer(canvas);
  }, []);

  return (
    <div className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full max-w-[1200px] max-h-[800px] mx-auto border touch-none"
      />
    </div>
  );
}

export default Platformer;
