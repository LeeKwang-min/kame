import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://kame.vercel.app';

  // 캔버스 게임 경로들
  const gameRoutes = [
    'tetris',
    'snake',
    'flappybird',
    'dino',
    'pong',
    'breakout',
    '2048',
    'pacman',
    'asteroid',
    'spaceinvaders',
    'simon',
    'aimtrainer',
    'dodge',
    'fruitninja',
    'slot',
    'roulette',
    'highlow',
    'rps',
    'doodle',
    'matchpairs',
    'stairs',
    'towerblocks',
    'enhance',
    'burger',
    'missilecommand',
    'kero33',
    'crossyroad',
    'platformer',
  ];

  // 유틸리티 경로들
  const utilityRoutes = ['ladder', 'wheel'];

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...gameRoutes.map((route) => ({
      url: `${baseUrl}/${route}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...utilityRoutes.map((route) => ({
      url: `${baseUrl}/${route}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    })),
  ];
}
