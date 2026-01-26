'use client';
import { useEffect, useRef } from 'react';
import { setupKero33 } from '../_lib/game';

function Kero33() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    return setupKero33(canvas);
  }, []);

  return (
    <div className="w-[600px] h-[600px]">
      <canvas ref={canvasRef} className="w-full h-full border touch-none" />
    </div>
  );
}

export default Kero33;
