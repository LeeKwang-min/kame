"use client";
import { useEffect, useRef } from "react";
import { setupDodge } from "../_lib/game";
import RankBoard from "@/components/common/RankBoard";

function Dodge() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

   return setupDodge(canvas)
  }, []);

   return (
    <div className="w-full h-full">
      <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
    </div>
  );

  // return (
  //   <div className="w-full h-full gap-2 grid grid-cols-[1fr_180px]">
  //     <canvas ref={canvasRef} className="w-full h-[600px] border touch-none" />
  //     <RankBoard data={[{
  //       initials: "AAA",
  //       score: 100,
  //     }, {
  //       initials: "BBB",
  //       score: 90,
  //     }, {
  //       initials: "CCC",
  //       score: 80,
  //     }, {
  //       initials: "DDD",
  //       score: 70,
  //     }]} className="max-h-[600px]" />
  //   </div>
  // );
}

export default Dodge;