// Canvas 설정
export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

// 버튼 설정
export const BUTTON_RADIUS = 80;
export const BUTTON_POSITIONS = [
  { x: 280, y: 200, color: '#e74c3c', activeColor: '#ff6b6b' }, // 빨강 (좌상)
  { x: 520, y: 200, color: '#3498db', activeColor: '#74b9ff' }, // 파랑 (우상)
  { x: 280, y: 400, color: '#2ecc71', activeColor: '#55efc4' }, // 초록 (좌하)
  { x: 520, y: 400, color: '#f1c40f', activeColor: '#ffeaa7' }, // 노랑 (우하)
] as const;

// 사운드 주파수 (Hz)
export const BUTTON_FREQUENCIES = [
  264, // Do (빨강)
  330, // Mi (파랑)
  392, // Sol (초록)
  528, // 높은 Do (노랑)
] as const;

// 게임 타이밍
export const PATTERN_SHOW_DURATION = 600; // 각 버튼이 빛나는 시간 (ms)
export const PATTERN_GAP_DURATION = 200; // 버튼 사이 간격 (ms)
export const INPUT_TIMEOUT = 5000; // 입력 대기 시간 (ms)

// 점수 설정
export const BASE_SCORE_PER_ROUND = 100; // 라운드당 기본 점수
export const SPEED_BONUS_MAX = 50; // 최대 속도 보너스
export const SPEED_REDUCTION_INTERVAL = 10; // 속도 증가 간격 (라운드)
export const SPEED_REDUCTION_RATE = 0.1; // 속도 증가율 (10%)

// 애니메이션
export const BUTTON_GLOW_SIZE = 20;
export const SCORE_POPUP_DURATION = 1000;
