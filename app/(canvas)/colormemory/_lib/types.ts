export type TGameState =
  | 'start'
  | 'loading'
  | 'showing'
  | 'input'
  | 'success'
  | 'fail'
  | 'gameover';

export type TButton = {
  x: number;
  y: number;
  color: string;
  activeColor: string;
  isActive: boolean;
  isPressing: boolean;
};

export type TScorePopup = {
  text: string;
  x: number;
  y: number;
  alpha: number;
  createdAt: number;
};
