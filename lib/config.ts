import { TBannerItem, TFeaturedGame, TMenu } from '@/@types/menus';

export const MENU_LIST: TMenu[] = [
  // Arcade
  {
    name: {
      kor: '테트릭스',
      eng: 'Tetrix',
    },
    href: '/tetrix',
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
      kor: '팩 메이즈',
      eng: 'Pac Maze',
    },
    href: '/pacmaze',
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
      eng: 'Brick Out',
    },
    href: '/brickout',
    category: 'Arcade',
  },
  {
    name: {
      kor: '탁구',
      eng: 'Paddle Rally',
    },
    href: '/paddlerally',
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
      kor: '스페이스 레이더',
      eng: 'Space Raiders',
    },
    href: '/spaceraiders',
    category: 'Arcade',
  },
  {
    name: {
      kor: '미사일 가드',
      eng: 'Missile Guard',
    },
    href: '/missileguard',
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
  {
    name: {
      kor: 'K-레이싱',
      eng: 'K-Racing',
    },
    href: '/kracing',
    category: 'Arcade',
    platform: 'both',
  },
  {
    name: {
      kor: 'K-레이싱 2',
      eng: 'K-Racing 2',
    },
    href: '/kracing2',
    category: 'Arcade',
    platform: 'both',
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
      kor: '플래피 윙즈',
      eng: 'Flappy Wings',
    },
    href: '/flappywings',
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
      kor: '두들 홉',
      eng: 'Doodle Hop',
    },
    href: '/doodlehop',
    category: 'Action',
  },
  {
    name: {
      kor: '길건너기',
      eng: 'Road Cross',
    },
    href: '/roadcross',
    category: 'Action',
  },
  {
    name: {
      kor: '끝없는 계단',
      eng: 'Endless Stairs',
    },
    href: '/endlessstairs',
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
      kor: '드롭 웰',
      eng: 'Drop Well',
    },
    href: '/dropwell',
    category: 'Action',
  },
  {
    name: {
      kor: '헥사 스핀',
      eng: 'Hexa Spin',
    },
    href: '/hexaspin',
    category: 'Action',
    platform: 'both',
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
      kor: '젤리 팝',
      eng: 'Jelly Pop',
    },
    href: '/jellypop',
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
      kor: '퀸즈',
      eng: 'Queens',
    },
    href: '/queens',
    category: 'Puzzle',
    platform: 'both',
  },
  {
    name: {
      kor: '리플',
      eng: 'Ripple',
    },
    href: '/ripple',
    category: 'Puzzle',
    platform: 'both',
  },
  {
    name: {
      kor: '솔리테어',
      eng: 'Solitaire',
    },
    href: '/solitaire',
    category: 'Puzzle',
    platform: 'both',
  },
  {
    name: {
      kor: '수박 게임',
      eng: 'Watermelon Game',
    },
    href: '/suikagame',
    category: 'Puzzle',
    platform: 'both',
  },
  {
    name: {
      kor: '워터 소트',
      eng: 'Water Sort',
    },
    href: '/watersort',
    category: 'Puzzle',
    platform: 'both',
  },
  {
    name: {
      kor: '오목',
      eng: 'Gomoku',
    },
    href: '/gomoku',
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
  {
    name: {
      kor: '탭 제국',
      eng: 'Tap Empire',
    },
    href: '/tapempire',
    category: 'Idle',
    platform: 'both',
  },
  // {
  //   name: {
  //     kor: '쿠키 공장',
  //     eng: 'Cookie Bakery',
  //   },
  //   href: '/cookiebakery',
  //   category: 'Idle',
  //   platform: 'both',
  // },
  // {
  //   name: {
  //     kor: '레모네이드 가판대',
  //     eng: 'Lemonade Stand',
  //   },
  //   href: '/lemonadestand',
  //   category: 'Idle',
  //   platform: 'both',
  // },
  {
    name: {
      kor: '던전 상인',
      eng: 'Dungeon Merchant',
    },
    href: '/dungeonmerchant',
    category: 'Idle',
    platform: 'both',
  },
  {
    name: {
      kor: '주식왕',
      eng: 'Stock Trader',
    },
    href: '/stocktrader',
    category: 'Idle',
    platform: 'both',
  },
  // {
  //   name: {
  //     kor: '우주 식민지',
  //     eng: 'Space Colony',
  //   },
  //   href: '/spacecolony',
  //   category: 'Idle',
  //   platform: 'both',
  // },
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
      kor: '후르츠 슬래시',
      eng: 'Fruit Slash',
    },
    href: '/fruitslash',
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
      kor: '컬러 메모리',
      eng: 'Color Memory',
    },
    href: '/colormemory',
    category: 'Reflex',
  },
  {
    name: {
      kor: '리듬 비트',
      eng: 'Rhythm Beat',
    },
    href: '/rhythmbeat',
    category: 'Reflex',
    platform: 'both',
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
  // Multiplayer
  {
    name: {
      kor: '멀티 칠판',
      eng: 'Multi Whiteboard',
    },
    href: '/whiteboard',
    category: 'Multiplayer',
    platform: 'both',
  },
  {
    name: {
      kor: '오목 온라인',
      eng: 'Gomoku Online',
    },
    href: '/gomoku-online',
    category: 'Multiplayer',
    platform: 'both',
  },
];

export const FEATURED_GAMES: TFeaturedGame[] = [
  {
    href: '/tetrix',
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
    href: '/endlessstairs',
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
    href: '/fruitslash',
    description: {
      kor: '날아오는 과일을 칼로 베어내는 액션 게임',
      eng: 'Slash flying fruits with your blade',
    },
  },
  {
    href: '/solitaire',
    description: {
      kor: '클래식 카드 게임, 클론다이크 솔리테어',
      eng: 'The classic Klondike Solitaire card game',
    },
  },
  {
    href: '/suikagame',
    description: {
      kor: '같은 과일을 합쳐 수박을 만들어보세요!',
      eng: 'Merge same fruits to make a watermelon!',
    },
  },
  {
    href: '/tapempire',
    description: {
      kor: '10분 안에 최대한 큰 제국을 건설하세요!',
      eng: 'Build the biggest empire in 10 minutes!',
    },
  },
  {
    href: '/hexaspin',
    description: {
      kor: '회전하는 육각형 속에서 살아남으세요!',
      eng: 'Survive inside the spinning hexagon!',
    },
  },
];

export const BANNER_ITEMS: TBannerItem[] = [
  {
    type: 'card',
    icon: '👑',
    bgColor: 'from-yellow-900/50 to-amber-900/50',
    title: { kor: '새로운 게임 출시!', eng: 'New Game Released!' },
    description: {
      kor: '10분 안에 최대한 큰 제국을 건설하세요!',
      eng: 'Build the biggest empire in 10 minutes!',
    },
    href: '/tapempire',
    ctaText: { kor: '지금 플레이', eng: 'Play Now' },
  },
  {
    type: 'card',
    icon: '🎮',
    bgColor: 'from-cyan-900/50 to-purple-900/50',
    title: { kor: '솔리테어', eng: 'Solitaire' },
    description: {
      kor: '클래식 카드 게임을 즐겨보세요',
      eng: 'Enjoy the classic card game',
    },
    href: '/solitaire',
    ctaText: { kor: '지금 플레이', eng: 'Play Now' },
  },
  {
    type: 'card',
    icon: '🏰',
    bgColor: 'from-yellow-900/50 to-red-900/50',
    title: { kor: '타워 블록 챌린지', eng: 'Tower Blocks Challenge' },
    description: {
      kor: '가장 높은 타워를 쌓아보세요!',
      eng: 'Build the tallest tower!',
    },
    href: '/towerblocks',
    ctaText: { kor: '도전하기', eng: 'Try Now' },
  },
  {
    type: 'announcement',
    title: { kor: 'KAME에 오신 것을 환영합니다', eng: 'Welcome to KAME' },
    description: {
      kor: '50개 이상의 미니게임을 즐겨보세요!',
      eng: 'Enjoy 50+ mini games!',
    },
    bgColor: 'from-arcade-cyan/20 to-arcade-magenta/20',
    badge: { kor: '환영', eng: 'Welcome' },
  },
];

export const CATEGORY_TABS = [
  { id: 'ALL', iconName: 'Dice5' as const },
  { id: 'FEATURED', iconName: 'Star' as const },
  { id: 'Arcade', iconName: 'Dice5' as const },
  { id: 'Action', iconName: 'Gamepad2' as const },
  { id: 'Puzzle', iconName: 'Puzzle' as const },
  { id: 'Reflex', iconName: 'Zap' as const },
  { id: 'Idle', iconName: 'TrendingUp' as const },
  { id: 'Good Luck', iconName: 'Clover' as const },
  { id: 'Utility', iconName: 'Wrench' as const },
  { id: 'Multiplayer', iconName: 'Users' as const },
] as const;
