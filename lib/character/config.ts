// 캐릭터 스프라이트 설정
export const CHARACTER_CONFIG = {
  // 스프라이트 시트 설정 (1024x1024, 4x4 그리드)
  spriteSize: 256, // 각 프레임 크기 (256x256)
  cols: 4, // 가로 프레임 수
  rows: 4, // 세로 프레임 수 (애니메이션 종류)

  // 애니메이션 속도 (ms)
  frameInterval: 200,

  // 캐릭터 종류
  types: ['male', 'female'] as const,

  // 애니메이션 종류 (행 인덱스)
  animations: {
    idle: 0,
    sitting: 1,
    happy: 2,
    sleep: 3,
  } as const,
};

export type TCharacterType = (typeof CHARACTER_CONFIG.types)[number];
export type TAnimationType = keyof typeof CHARACTER_CONFIG.animations;

// 캐릭터 스프라이트 경로 (PNG로 교체 시 확장자만 변경)
export const getCharacterSpritePath = (type: TCharacterType): string => {
  return `/characters/${type}-sprite.png`;
};

// 배경 이미지 경로 (PNG로 교체 시 확장자만 변경)
export const ROOM_BACKGROUND_PATH = '/characters/room-bg.png';
