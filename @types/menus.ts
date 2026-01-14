export type TMenu = {
  name: {
    kor: string;
    eng: string;
  };
  href: string;
  category: string;
  target?: string;
  disabled?: boolean;
};

export type TMenuList = TMenu[];
