// Canvas 설정
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// 게임 설정
export const GAME_DURATION = 30; // 초
export const SIMULTANEOUS_TARGETS = 1; // 동시에 떠 있는 타겟 개수
export const TARGET_LIFETIME = 2.0; // 타겟 유지 시간 (초)

// 타겟 크기
export const TARGET_MIN_RADIUS = 15;
export const TARGET_MAX_RADIUS = 30;
export const TARGET_DEFAULT_RADIUS = 25;

// 타겟 생성 범위 (여백 비율)
export const SPAWN_MARGIN = 0.1; // 상하좌우 10% 여백

// 점수
export const BASE_SCORE = 100;
export const SPEED_BONUS_MAX = 50; // 빠르게 맞출수록 보너스
export const COMBO_THRESHOLD = 3; // 콤보 시작 기준
export const COMBO_MULTIPLIER = 1.2; // 콤보 배율

// 타겟 색상
export const TARGET_COLORS = [
  '#e74c3c', // 빨강
  '#3498db', // 파랑
  '#2ecc71', // 초록
  '#f39c12', // 주황
  '#9b59b6', // 보라
  '#1abc9c', // 청록
];

// 애니메이션
export const TARGET_SHRINK_TIME = 0.5; // 타겟이 사라지기 전 수축 시간
export const PARTICLE_COUNT = 8;
export const PARTICLE_LIFE = 0.5;
export const FLOATING_TEXT_DURATION = 1.5;
