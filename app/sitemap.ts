import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://kame.vercel.app';

  // 캔버스 게임 경로들
  const gameRoutes = [
    'tetrix',
    'snake',
    'flappywings',
    'dino',
    'paddlerally',
    'brickout',
    '2048',
    'pacmaze',
    'asteroid',
    'spaceraiders',
    'colormemory',
    'aimtrainer',
    'dodge',
    'fruitslash',
    'slot',
    'roulette',
    'highlow',
    'rps',
    'doodlehop',
    'matchpairs',
    'endlessstairs',
    'towerblocks',
    'enhance',
    'burger',
    'missileguard',
    'kero33',
    'roadcross',
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
