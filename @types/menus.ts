import { TGamePlatform } from './game-meta';

export type TMenu = {
  name: {
    kor: string;
    eng: string;
  };
  href: string;
  category: string;
  target?: string;
  disabled?: boolean;
  platform?: TGamePlatform;
};

export type TMenuList = TMenu[];

export type TFeaturedGame = {
  href: string;
  description: {
    kor: string;
    eng: string;
  };
};
