// AdSense slot IDs — AdSense 콘솔에서 생성 후 교체
export const AD_SLOTS: Record<string, string> = {
  infeed: 'INFEED_SLOT_ID',
  'sidebar-left': 'SIDEBAR_LEFT_SLOT_ID',
  'sidebar-right': 'SIDEBAR_RIGHT_SLOT_ID',
  'sidebar-main': 'SIDEBAR_MAIN_SLOT_ID',
  gameover: 'GAMEOVER_SLOT_ID',
  anchor: 'ANCHOR_SLOT_ID',
};

// 인피드 광고 레이아웃 키 (AdSense 콘솔에서 생성 후 교체)
export const INFEED_LAYOUT_KEY = 'LAYOUT_KEY';

// 게임오버 광고 빈도 (N판마다 1번)
export const GAME_OVER_AD_INTERVAL = 3;
