// Canvas 설정
export const CANVAS_WIDTH = 700;
export const CANVAS_HEIGHT = 750;

// 게임 설정
export const GRID_COLS = 4;
export const GRID_ROWS = 4;
export const TOTAL_CARDS = GRID_COLS * GRID_ROWS;
export const TOTAL_PAIRS = TOTAL_CARDS / 2;

// 카드 설정
export const CARD_WIDTH = 140;
export const CARD_HEIGHT = 140; // 정사각형
export const CARD_SPACING = 20;
export const CARD_BORDER_RADIUS = 12;

// 게임 타이밍
export const TIME_LIMIT = 90; // 90초
export const FLIP_ANIMATION_DURATION = 300; // ms
export const MATCH_DELAY = 400; // ms (매치 확인 시간)
export const MISMATCH_DELAY = 400; // ms (실패 시 빠르게 뒤집기)

// 점수 설정
export const MATCH_SCORE = 100;
export const COMBO_MULTIPLIER = 100; // 연속 매치마다 +100점씩 증가
export const MISS_PENALTY = 10;
export const TIME_BONUS_MULTIPLIER = 10; // 남은 시간 × 10점

// 카드 이모지 (8쌍 = 16장)
export const CARD_EMOJIS = [
  '🍎', // 사과
  '🍊', // 오렌지
  '🍋', // 레몬
  '🍌', // 바나나
  '🍉', // 수박
  '🍇', // 포도
  '🍓', // 딸기
  '🍒', // 체리
];

// 색상
export const CARD_BACK_COLOR = '#3498db';
export const CARD_FRONT_COLOR = '#ffffff'; // 흰색 카드
export const CARD_BORDER_COLOR = '#2c3e50';
export const CARD_MATCHED_COLOR = '#2ecc71';
export const CARD_HIGHLIGHT_COLOR = '#f39c12';
