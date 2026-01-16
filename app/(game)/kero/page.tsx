"use client";

import { useRef } from "react";

function KeroPage() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  return (
    <section className="w-full h-full">
      <div className="w-[600px] h-[600px]">
        <canvas ref={canvasRef} className="w-full h-full border touch-none" />
      </div>
    </section>
  );
}

export default KeroPage;
