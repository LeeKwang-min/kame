// ==================== 캔버스 설정 ====================
export const CANVAS_WIDTH = 400;
export const CANVAS_HEIGHT = 600;

// ==================== 플레이어 설정 ====================
export const PLAYER_WIDTH = 128;
export const PLAYER_HEIGHT = 128;
export const PLAYER_OFFSET_Y = 36; // 이미지 내 캐릭터가 중앙에 있어서 아래로 오프셋
export const PLAYER_MOVE_DURATION = 150; // 이동 애니메이션 시간 (ms)

// ==================== 이미지 경로 ====================
export const PLAYER_LEFT_IMAGE = '/stairs/player_left.PNG';
export const PLAYER_RIGHT_IMAGE = '/stairs/player_right.PNG';
export const BACKGROUND_IMAGE = '/stairs/background.png';

// ==================== 계단 설정 ====================
export const STAIR_WIDTH = 60;
export const STAIR_HEIGHT = 12;
export const STAIR_GAP_X = 50; // 계단 간 수평 거리
export const STAIR_GAP_Y = 45; // 계단 간 수직 거리
export const INITIAL_STAIRS = 15; // 초기 계단 개수

// ==================== 게임 설정 ====================
export const MISS_TOLERANCE = 30; // 플레이어가 계단에서 벗어날 수 있는 허용 범위
export const CAMERA_SMOOTH_SPEED = 8; // 카메라 따라가는 속도 (부드러움)
export const PLAYER_TARGET_Y_RATIO = 0.65; // 플레이어가 위치할 화면 Y 비율 (0.65 = 하단 65% 위치)

// ==================== 시간(생명) 설정 ====================
export const INITIAL_TIME = 3.0; // 초기 시간 (초)
export const MAX_TIME = 5.0; // 최대 시간 (초)
export const TIME_BONUS_BASE = 0.5; // 기본 시간 보너스 (계단 올라갈 때)
export const TIME_DECAY_BASE = 1.0; // 기본 시간 감소 속도 (초당)
export const TIME_DECAY_INCREMENT = 0.005; // 점수당 시간 감소 속도 증가량
export const TIME_BONUS_DECAY = 0.005; // 점수당 시간 보너스 감소량
export const MIN_TIME_BONUS = 0.2; // 최소 시간 보너스
export const WRONG_DIRECTION_PENALTY = 1.0; // 잘못된 방향 입력 시 시간 페널티 (초)

// ==================== Progress Bar 설정 ====================
export const PROGRESS_BAR_WIDTH = 20; // 프로그레스 바 너비
export const PROGRESS_BAR_MARGIN = 15; // 화면 가장자리로부터의 여백
export const PROGRESS_BAR_HEIGHT_RATIO = 0.7; // 화면 높이 대비 바 높이 비율

// ==================== 점수 설정 ====================
export const SCORE_PER_STAIR = 100;
