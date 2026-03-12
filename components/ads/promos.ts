export type TPromo = {
  title: string;
  description: string;
  href: string;
  external?: boolean;
  emoji: string;
};

export const PROMOS: TPromo[] = [
  {
    title: 'Tetrix',
    description: '클래식 블록 퍼즐의 정석',
    href: '/tetrix',
    emoji: '🧱',
  },
  {
    title: 'Kustom',
    description: '나만의 전략으로 전투에서 승리하세요',
    href: '/kustom',
    emoji: '⚔️',
  },
  {
    title: 'Mentiqs',
    description: '두뇌 건강을 위한 퍼즐 게임 모음',
    href: 'https://mentiqs.vercel.app',
    external: true,
    emoji: '🧠',
  },
  {
    title: 'Kools',
    description: '편리한 유틸리티 도구 모음',
    href: 'https://mini-kools.vercel.app',
    external: true,
    emoji: '🛠️',
  },
  {
    title: 'Survivors',
    description: '몰려오는 적들을 물리치고 살아남으세요',
    href: '/survivors',
    emoji: '🧟',
  },
  {
    title: 'Snake Game',
    description: '점점 길어지는 뱀을 조종하세요',
    href: '/snake',
    emoji: '🐍',
  },
];
