import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'suikagame',
  title: '수박 게임',
  engine: 'phaser',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'puzzle',
  difficulty: 'progressive',
};

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 720;

export const WALL_THICKNESS = 20;
export const CONTAINER_TOP = 180;
export const CONTAINER_LEFT = 40;
export const CONTAINER_RIGHT = GAME_WIDTH - 40;
export const CONTAINER_BOTTOM = GAME_HEIGHT - 20;

export const DROP_Y = 80;
export const DROP_MIN_X = CONTAINER_LEFT + 30;
export const DROP_MAX_X = CONTAINER_RIGHT - 30;

export const DEADLINE_GRACE_MS = 2000;
export const DROP_COOLDOWN_MS = 500;

// 과일 설정
// texture 필드: null이면 단색 원 + 텍스트, 문자열이면 해당 텍스처 키 사용
// 에셋 추가 방법:
// 1. public/images/suikagame/ 폴더에 과일 이미지 배치 (예: cherry.png)
// 2. BootScene.preload()에서 this.load.image('fruit_cherry', '/images/suikagame/cherry.png') 추가
// 3. 아래 FRUIT_CONFIG에서 해당 과일의 texture를 'fruit_cherry'로 변경
export const FRUIT_CONFIG = [
  { name: '체리',     emoji: '🍒', radius: 15, color: 0xe74c3c, score: 1,  texture: null },
  { name: '딸기',     emoji: '🍓', radius: 20, color: 0xff6b6b, score: 3,  texture: null },
  { name: '포도',     emoji: '🍇', radius: 28, color: 0x9b59b6, score: 6,  texture: null },
  { name: '한라봉',   emoji: '🍊', radius: 35, color: 0xf39c12, score: 10, texture: null },
  { name: '감',       emoji: '🍑', radius: 42, color: 0xe67e22, score: 15, texture: null },
  { name: '사과',     emoji: '🍎', radius: 50, color: 0xc0392b, score: 21, texture: null },
  { name: '배',       emoji: '🍐', radius: 58, color: 0xf1c40f, score: 28, texture: null },
  { name: '복숭아',   emoji: '🍑', radius: 66, color: 0xffb6c1, score: 36, texture: null },
  { name: '파인애플', emoji: '🍍', radius: 75, color: 0xf39c12, score: 45, texture: null },
  { name: '멜론',     emoji: '🍈', radius: 85, color: 0x2ecc71, score: 55, texture: null },
  { name: '수박',     emoji: '🍉', radius: 95, color: 0x27ae60, score: 66, texture: null },
] as const;

export const MAX_DROP_LEVEL = 4;

export const PHYSICS_CONFIG = {
  gravity: { x: 0, y: 1.5 },
  restitution: 0.2,
  friction: 0.3,
  frictionStatic: 0.5,
  density: 0.001,
};
