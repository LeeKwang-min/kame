// ==================== 패들 설정 ====================
export const PADDLE_WIDTH = 15; // 패들 두께 (좌우)
export const PADDLE_HEIGHT = 100; // 패들 높이 (상하)
export const PADDLE_MARGIN = 20; // 화면 가장자리에서 패들까지의 거리
export const PADDLE_SPEED = 400; // 패들 이동 속도 (픽셀/초)

// ==================== 공 설정 ====================
export const BALL_RADIUS = 10; // 공의 반지름
export const BALL_SPEED = 400; // 공의 기본 속도
export const BALL_SPEED_INCREASE = 20; // 패들에 맞을 때마다 증가하는 속도

// ==================== 게임 설정 ====================
export const WIN_SCORE = 5; // 이 점수에 도달하면 게임 승리

// ==================== AI 설정 ====================
export const AI_SPEED = {
  easy: 180,
  normal: 280,
  hard: 380,
};

// AI가 반응하는 "데드존" (이 범위 안에 있으면 움직이지 않음)
export const AI_DEADZONE = {
  easy: 40,
  normal: 20,
  hard: 5,
};

// AI 실수 확률 (높을수록 실수 많이 함)
export const AI_ERROR_CHANCE = {
  easy: 0.03, // 3% 확률로 실수
  normal: 0.01, // 1%
  hard: 0.002, // 0.2%
};
