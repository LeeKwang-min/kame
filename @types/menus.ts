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

export type TBannerItem =
  | {
      type: 'image';
      src: string;
      title: { kor: string; eng: string };
      description: { kor: string; eng: string };
      href?: string;
      ctaText?: { kor: string; eng: string };
    }
  | {
      type: 'card';
      icon: string;
      bgColor: string;
      title: { kor: string; eng: string };
      description: { kor: string; eng: string };
      href?: string;
      ctaText?: { kor: string; eng: string };
    }
  | {
      type: 'announcement';
      title: { kor: string; eng: string };
      description: { kor: string; eng: string };
      bgColor: string;
      badge?: { kor: string; eng: string };
    };
