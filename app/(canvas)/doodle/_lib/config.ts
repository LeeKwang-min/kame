// ==================== 캔버스 설정 ====================
export const CANVAS_WIDTH = 400; // 기준 너비 (두들점프는 좁은 화면)
export const CANVAS_HEIGHT = 600;

// ==================== 플레이어 설정 ====================
export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 40;
export const PLAYER_SPEED = 300; // 좌우 이동 속도

// ==================== 점프/중력 설정 ====================
export const JUMP_FORCE = -650; // 일반 점프력
export const SPRING_JUMP_FORCE = -1200; // 스프링 점프력
export const GRAVITY = 1200;

// ==================== 플랫폼 설정 ====================
export const PLATFORM_WIDTH = 65;
export const PLATFORM_HEIGHT = 15;
export const PLATFORM_GAP_MIN = 60; // 플랫폼 간 최소 간격
export const PLATFORM_GAP_MAX = 100; // 플랫폼 간 최대 간격

// 플랫폼 종류별 확률 (점수에 따라 변경)
export const PLATFORM_CHANCES = {
  normal: 0.6,
  moving: 0.2,
  breaking: 0.15,
  spring: 0.05,
};

// 움직이는 플랫폼 속도
export const MOVING_PLATFORM_SPEED = 100;

// ==================== 스크롤 설정 ====================
export const SCROLL_THRESHOLD = 200; // 이 높이 이상 올라가면 스크롤 시작

// ==================== 초기 플랫폼 개수 ====================
export const INITIAL_PLATFORMS = 8;
