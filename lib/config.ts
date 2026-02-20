import { TFeaturedGame, TMenu } from '@/@types/menus';

export const MENU_LIST: TMenu[] = [
  // Arcade
  {
    name: {
      kor: '테트리스',
      eng: 'Tetris',
    },
    href: '/tetris',
    category: 'Arcade',
    platform: 'both',
  },
  {
    name: {
      kor: '뱀 게임',
      eng: 'Snake Game',
    },
    href: '/snake',
    category: 'Arcade',
  },
  {
    name: {
      kor: '팩맨',
      eng: 'Pac-Man',
    },
    href: '/pacman',
    category: 'Arcade',
  },
  {
    name: {
      kor: '키어로33',
      eng: 'Kero33',
    },
    href: '/kero33',
    category: 'Arcade',
  },
  {
    name: {
      kor: '벽돌 깨기',
      eng: 'Breakout',
    },
    href: '/breakout',
    category: 'Arcade',
  },
  {
    name: {
      kor: '탁구',
      eng: 'Pong',
    },
    href: '/pong',
    category: 'Arcade',
  },
  {
    name: {
      kor: '소행성',
      eng: 'Asteroid',
    },
    href: '/asteroid',
    category: 'Arcade',
  },
  {
    name: {
      kor: '스페이스 인베이더',
      eng: 'Space Invaders',
    },
    href: '/spaceinvaders',
    category: 'Arcade',
  },
  {
    name: {
      kor: '미사일 커맨드',
      eng: 'Missile Command',
    },
    href: '/missilecommand',
    category: 'Arcade',
  },
  {
    name: {
      kor: '버블 슈터',
      eng: 'Bubble Shooter',
    },
    href: '/bubbleshooter',
    category: 'Arcade',
  },
  // Action
  {
    name: {
      kor: '닷지',
      eng: 'Dodge',
    },
    href: '/dodge',
    category: 'Action',
    platform: 'both',
  },
  {
    name: {
      kor: '플래피 버드',
      eng: 'Flappy Bird',
    },
    href: '/flappybird',
    category: 'Action',
  },
  {
    name: {
      kor: '공룡 달리기',
      eng: 'Dino',
    },
    href: '/dino',
    category: 'Action',
  },
  {
    name: {
      kor: '두들 점프',
      eng: 'Doodle Jump',
    },
    href: '/doodle',
    category: 'Action',
  },
  {
    name: {
      kor: '길건너 친구들',
      eng: 'Crossy Road',
    },
    href: '/crossyroad',
    category: 'Action',
  },
  {
    name: {
      kor: '무한의 계단',
      eng: 'Infinite Stairs',
    },
    href: '/stairs',
    category: 'Action',
    platform: 'both',
  },
  {
    name: {
      kor: '햄버거 쌓기',
      eng: 'Burger Stack',
    },
    href: '/burger',
    category: 'Action',
  },
  {
    name: {
      kor: '타워 블록',
      eng: 'Tower Blocks',
    },
    href: '/towerblocks',
    category: 'Action',
    platform: 'both',
  },
  {
    name: {
      kor: '쿠스텀',
      eng: 'Kustom',
    },
    href: '/kustom',
    category: 'Action',
  },
  {
    name: {
      kor: '서바이버스',
      eng: 'Survivors',
    },
    href: '/survivors',
    category: 'Action',
  },
  {
    name: {
      kor: '헬리콥터',
      eng: 'Helicopter',
    },
    href: '/helicopter',
    category: 'Action',
  },
  {
    name: {
      kor: '다운웰',
      eng: 'Downwell',
    },
    href: '/downwell',
    category: 'Action',
  },
  // Puzzle
  {
    name: {
      kor: '2048',
      eng: '2048',
    },
    href: '/2048',
    category: 'Puzzle',
    platform: 'both',
  },
  {
    name: {
      kor: '컬러 플러드',
      eng: 'Color Flood',
    },
    href: '/colorflood',
    category: 'Puzzle',
  },
  {
    name: {
      kor: '라이츠 아웃',
      eng: 'Lights Out',
    },
    href: '/lightsout',
    category: 'Puzzle',
  },
  {
    name: {
      kor: '슬라이딩 퍼즐',
      eng: 'Sliding Puzzle',
    },
    href: '/slidingpuzzle',
    category: 'Puzzle',
  },
  {
    name: {
      kor: '노노그램',
      eng: 'Nonogram',
    },
    href: '/nonogram',
    category: 'Puzzle',
  },
  {
    name: {
      kor: '넘버 체인',
      eng: 'Number Chain',
    },
    href: '/numberchain',
    category: 'Puzzle',
  },
  {
    name: {
      kor: '지뢰 찾기',
      eng: 'Minesweeper',
    },
    href: '/minesweeper',
    category: 'Puzzle',
    platform: 'both',
  },
  {
    name: {
      kor: '카드 짝 맞추기',
      eng: 'Match Pairs',
    },
    href: '/matchpairs',
    category: 'Puzzle',
  },
  {
    name: {
      kor: '미로 탈출',
      eng: 'Maze Escape',
    },
    href: '/maze',
    category: 'Puzzle',
  },
  {
    name: {
      kor: '뿌요뿌요',
      eng: 'Puyo Puyo',
    },
    href: '/puyopuyo',
    category: 'Puzzle',
  },
  {
    name: {
      kor: '쥬얼 크러쉬',
      eng: 'Jewel Crush',
    },
    href: '/jewelcrush',
    category: 'Puzzle',
  },
  {
    name: {
      kor: '블록 퍼즐',
      eng: 'Block Puzzle',
    },
    href: '/blockpuzzle',
    category: 'Puzzle',
    platform: 'both',
  },
  {
    name: {
      kor: '랜덤 디펜스',
      eng: 'Random Defense',
    },
    href: '/randomdefense',
    category: 'Arcade',
  },
  // Reflex
  {
    name: {
      kor: '에임 트레이너',
      eng: 'Aim Trainer',
    },
    href: '/aimtrainer',
    category: 'Reflex',
  },
  {
    name: {
      kor: '후르츠 닌자',
      eng: 'Fruit Ninja',
    },
    href: '/fruitninja',
    category: 'Reflex',
  },
  {
    name: {
      kor: '타이핑 폴',
      eng: 'Typing Fall',
    },
    href: '/typingfall',
    category: 'Reflex',
  },
  {
    name: {
      kor: '사이먼',
      eng: 'Simon',
    },
    href: '/simon',
    category: 'Reflex',
  },
  // {
  //   name: {
  //     kor: '플랫포머',
  //     eng: 'Platformer',
  //   },
  //   href: '/platformer',
  //   category: 'Action',
  // },
  // Good Luck
  {
    name: {
      kor: '강화 시뮬레이터',
      eng: 'Enhance Simulator',
    },
    href: '/enhance',
    category: 'Good Luck',
  },
  {
    name: {
      kor: '슬롯머신',
      eng: 'Slot Machine',
    },
    href: '/slot',
    category: 'Good Luck',
  },
  {
    name: {
      kor: '하이로우',
      eng: 'High Low',
    },
    href: '/highlow',
    category: 'Good Luck',
  },
  {
    name: {
      kor: '룰렛',
      eng: 'Roulette',
    },
    href: '/roulette',
    category: 'Good Luck',
  },
  {
    name: {
      kor: '가위바위보',
      eng: 'Rock Paper Scissors',
    },
    href: '/rps',
    category: 'Good Luck',
  },
  // Utility
  {
    name: {
      kor: '사다리 타기',
      eng: 'Ladder Game',
    },
    href: '/ladder',
    category: 'Utility',
  },
  {
    name: {
      kor: '돌림판',
      eng: 'Spinning Wheel',
    },
    href: '/wheel',
    category: 'Utility',
  },
];

export const FEATURED_GAMES: TFeaturedGame[] = [
  {
    href: '/tetris',
    description: {
      kor: '블록을 쌓아 줄을 완성하는 클래식 퍼즐 게임',
      eng: 'Stack blocks and clear lines in this classic puzzle',
    },
  },
  {
    href: '/snake',
    description: {
      kor: '먹이를 먹고 점점 길어지는 뱀을 조종하세요',
      eng: 'Guide the growing snake to eat and survive',
    },
  },
  {
    href: '/kero33',
    description: {
      kor: '반짝이는 키어로와 함께하는 아케이드 게임',
      eng: 'Play the sparkling Kero33 arcade game',
    },
  },
  {
    href: '/randomdefense',
    description: {
      kor: '랜덤 유닛을 배치해 적의 침공을 막아내세요',
      eng: 'Place random units to defend against enemies',
    },
  },
  {
    href: '/stairs',
    description: {
      kor: '끝없이 이어지는 계단을 올라가세요',
      eng: 'Climb the never-ending stairs',
    },
  },
  {
    href: '/kustom',
    description: {
      kor: '나만의 전략으로 전투에서 승리하세요',
      eng: 'Win battles with your own strategy',
    },
  },
  {
    href: '/survivors',
    description: {
      kor: '몰려오는 적들을 물리치고 살아남으세요',
      eng: 'Survive endless waves of enemies',
    },
  },
  {
    href: '/2048',
    description: {
      kor: '같은 숫자를 합쳐 2048을 만들어 보세요',
      eng: 'Merge tiles to reach the 2048 number',
    },
  },
  {
    href: '/maze',
    description: {
      kor: '복잡한 미로를 탐험하고 출구를 찾으세요',
      eng: 'Navigate the maze and find the exit',
    },
  },
  {
    href: '/blockpuzzle',
    description: {
      kor: '블록을 배치하여 줄을 완성하세요',
      eng: 'Place blocks to complete lines',
    },
  },
  {
    href: '/fruitninja',
    description: {
      kor: '날아오는 과일을 칼로 베어내는 액션 게임',
      eng: 'Slash flying fruits with your blade',
    },
  },
];
