// ==================== 캔버스 설정 ====================
export const GROUND_Y = 500; // 바닥 y 위치 (캔버스 아래쪽)

// ==================== 공룡 설정 ====================
export const DINO_WIDTH = 44;
export const DINO_HEIGHT = 47;
export const DINO_X = 50; // 공룡 x 위치 (고정)
export const DINO_DUCK_HEIGHT = 30; // 숙일 때 높이

// ==================== 점프 설정 ====================
export const JUMP_FORCE = -600; // 점프 시 초기 속도 (음수 = 위로)
export const GRAVITY = 1800; // 중력 가속도
export const FAST_FALL_SPEED = 800; // 추가: 빠른 낙하 속도

// ==================== 게임 속도 ====================
export const INITIAL_SPEED = 300; // 초기 게임 속도
export const SPEED_INCREMENT = 0.5; // 프레임당 속도 증가량
export const MAX_SPEED = 800; // 최대 속도

// ==================== 장애물 설정 ====================
export const OBSTACLE_MIN_GAP = 400; // 장애물 최소 간격
export const OBSTACLE_MAX_GAP = 600; // 장애물 최대 간격

// 장애물 크기
export const CACTUS_SMALL = { width: 17, height: 35 };
export const CACTUS_LARGE = { width: 25, height: 50 };
export const BIRD_SIZE = { width: 46, height: 40 };

// 새 높이 (여러 레벨)
export const BIRD_HEIGHTS = [GROUND_Y - 30, GROUND_Y - 75, GROUND_Y - 100];

// ==================== 바닥 설정 ====================
export const GROUND_SEGMENT_WIDTH = 600; // 바닥 세그먼트 너비
