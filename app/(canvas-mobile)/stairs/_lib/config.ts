import { TGameMeta } from '@/@types/game-meta';

export const GAME_META: TGameMeta = {
  id: 'stairs',
  title: '무한의 계단',
  engine: 'canvas',
  platform: 'both',
  touchControls: 'tap',
  orientation: 'portrait',
  category: 'action',
  difficulty: 'progressive',
};

// ==================== 캔버스 설정 ====================
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 620;

// ==================== 플레이어 설정 ====================
export const PLAYER_WIDTH = 128;
export const PLAYER_HEIGHT = 128;
export const PLAYER_OFFSET_Y = 36;
export const PLAYER_MOVE_DURATION = 150;

// ==================== 이미지 경로 ====================
export const PLAYER_LEFT_IMAGE = '/stairs/player_left.PNG';
export const PLAYER_RIGHT_IMAGE = '/stairs/player_right.PNG';
export const BACKGROUND_IMAGE = '/stairs/background.png';

// ==================== 계단 설정 ====================
export const STAIR_WIDTH = 60;
export const STAIR_HEIGHT = 12;
export const STAIR_GAP_X = 50;
export const STAIR_GAP_Y = 45;
export const INITIAL_STAIRS = 15;

// ==================== 게임 설정 ====================
export const MISS_TOLERANCE = 30;
export const CAMERA_SMOOTH_SPEED = 8;
export const PLAYER_TARGET_Y_RATIO = 0.65;

// ==================== 시간(생명) 설정 ====================
export const INITIAL_TIME = 3.0;
export const MAX_TIME = 5.0;
export const TIME_BONUS_BASE = 0.5;
export const TIME_DECAY_BASE = 1.0;
export const TIME_DECAY_INCREMENT = 0.005;
export const TIME_BONUS_DECAY = 0.005;
export const MIN_TIME_BONUS = 0.3;
export const WRONG_DIRECTION_PENALTY = 1.0;

// ==================== Progress Bar 설정 ====================
export const PROGRESS_BAR_WIDTH = 20;
export const PROGRESS_BAR_MARGIN = 15;
export const PROGRESS_BAR_HEIGHT_RATIO = 0.7;

// ==================== 점수 설정 ====================
export const SCORE_PER_STAIR = 1;
