import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { MainScene } from './scenes/MainScene';
import { GameOverScene } from './scenes/GameOverScene';

// Phaser 게임 전체 설정
export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO, // WebGL 우선, 안되면 Canvas로 fallback
  width: 800, // 게임 캔버스 너비
  height: 600, // 게임 캔버스 높이
  backgroundColor: '#1a1a2e', // 배경색 (어두운 네이비)
  physics: {
    default: 'arcade', // Arcade Physics 사용
    arcade: {
      gravity: { x: 0, y: 0 }, // 중력 없음 (Breakout은 중력 불필요)
      debug: false, // true로 하면 충돌 박스가 보임 (개발 시 유용)
    },
  },
  scene: [BootScene, MainScene, GameOverScene], // 씬 등록 순서
  scale: {
    mode: Phaser.Scale.FIT, // 화면에 맞게 자동 스케일
    autoCenter: Phaser.Scale.CENTER_BOTH, // 중앙 정렬
  },
};

// 게임 상수들 (Canvas 버전의 config.ts와 비슷)
export const GAME_CONFIG = {
  // 공 설정
  BALL_RADIUS: 8,
  BALL_SPEED: 400,
  BALL_COLOR: 0x32cd32, // limegreen (Phaser는 16진수 사용)

  // 패들 설정
  PADDLE_WIDTH: 120,
  PADDLE_HEIGHT: 12,
  PADDLE_SPEED: 500,
  PADDLE_COLOR: 0x2e8b57, // seagreen
  PADDLE_Y_OFFSET: 50, // 바닥에서 패들까지 거리

  // 벽돌 설정
  BRICK_ROWS: 5,
  BRICK_COLS: 10,
  BRICK_WIDTH: 60,
  BRICK_HEIGHT: 20,
  BRICK_GAP: 4,
  BRICK_TOP_OFFSET: 60,
  BRICK_COLORS: [
    0xff6b6b, // 빨강
    0xffe66d, // 노랑
    0x4ecdc4, // 청록
    0x45b7d1, // 파랑
    0x96ceb4, // 연두
  ],

  // 점수
  BRICK_SCORE: 10,
};
