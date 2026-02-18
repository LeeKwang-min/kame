export type TGameEngine = 'canvas' | 'phaser';

export type TGamePlatform = 'web' | 'mobile' | 'both';

export type TTouchControls = 'swipe' | 'tap' | 'joystick' | 'drag' | 'none';

export type TGameOrientation = 'portrait' | 'landscape' | 'any';

export type TGameCategory = 'arcade' | 'action' | 'puzzle' | 'reflex' | 'luck';

export type TGameDifficulty = 'progressive' | 'fixed' | 'selectable';

export type TGameMeta = {
  id: string;
  title: string;
  engine: TGameEngine;
  platform: TGamePlatform;
  touchControls: TTouchControls;
  orientation: TGameOrientation;
  category: TGameCategory;
  difficulty: TGameDifficulty;
};
