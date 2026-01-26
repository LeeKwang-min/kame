'use client';
import { useEffect, useRef } from 'react';
import { setup2048 } from '../_lib/game';

function G2048() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    return setup2048(canvas);
  }, []);

  return (
    <div className="w-full h-full flex justify-center items-start">
      <canvas ref={canvasRef} className="border-none rounded-md" />
    </div>
  );
}

export default G2048;
