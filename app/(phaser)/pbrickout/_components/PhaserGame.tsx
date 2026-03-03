'use client';
import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { gameConfig } from '../_lib/config';

function PhaserGame() {
  // 게임 인스턴스와 DOM 컨테이너 참조
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // 컨테이너가 없거나 이미 게임이 생성되었으면 리턴
    if (!containerRef.current || gameRef.current) return;

    // Phaser 게임 인스턴스 생성
    // gameConfig의 parent 옵션을 컨테이너 DOM으로 설정
    gameRef.current = new Phaser.Game({
      ...gameConfig,
      parent: containerRef.current,
    });

    // Cleanup: 컴포넌트 언마운트 시 게임 인스턴스 파괴
    // 메모리 누수 방지를 위해 중요!
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true); // true: 캐시된 텍스처도 제거
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div className="w-full h-full">
      <div ref={containerRef} className="w-full h-[600px]" />
    </div>
  );
}

export default PhaserGame;
