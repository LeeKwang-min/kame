import type { Metadata } from 'next';
import { MENU_LIST, FEATURED_GAMES } from '@/lib/config';
import { SITE_URL, SITE_NAME } from '@/lib/constants';

const CATEGORY_KO: Record<string, string> = {
  Arcade: '아케이드',
  Action: '액션',
  Puzzle: '퍼즐',
  Reflex: '반응',
  Idle: '아이들',
  'Good Luck': '행운',
  Utility: '유틸리티',
};

function findMenu(href: string) {
  return MENU_LIST.find((m) => m.href === href);
}

function findFeatured(href: string) {
  return FEATURED_GAMES.find((f) => f.href === href);
}

export function getGameMetadata(href: string): Metadata {
  const menu = findMenu(href);
  if (!menu) return {};

  const featured = findFeatured(href);
  const titleEng = menu.name.eng;
  const titleKor = menu.name.kor;
  const categoryKo = CATEGORY_KO[menu.category] || menu.category;

  const description = featured
    ? `${featured.description.kor} - Kame에서 무료로 플레이하세요!`
    : `${titleKor} - 무료 ${categoryKo} 웹 게임. 브라우저에서 바로 플레이하세요!`;

  const keywords = [
    titleEng,
    titleKor,
    menu.category,
    categoryKo,
    '무료 게임',
    '웹 게임',
    'free game',
    'browser game',
    SITE_NAME,
  ];

  return {
    title: titleEng,
    description,
    keywords,
    openGraph: {
      title: `${titleEng} - ${titleKor}`,
      description,
      url: `${SITE_URL}${href}`,
      siteName: SITE_NAME,
      type: 'website',
      locale: 'ko_KR',
      images: [
        {
          url: `${SITE_URL}/api/og?game=${href.slice(1)}`,
          width: 1200,
          height: 630,
          alt: `${titleEng} - ${titleKor}`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${titleEng} - ${titleKor}`,
      description,
      images: [`${SITE_URL}/api/og?game=${href.slice(1)}`],
    },
    alternates: {
      canonical: `${SITE_URL}${href}`,
    },
  };
}

export function getGameJsonLd(href: string): Record<string, unknown> | null {
  const menu = findMenu(href);
  if (!menu) return null;

  const featured = findFeatured(href);
  const description = featured
    ? featured.description.kor
    : `${menu.name.kor} - 무료 웹 게임`;

  return {
    '@context': 'https://schema.org',
    '@type': 'VideoGame',
    name: menu.name.eng,
    alternateName: menu.name.kor,
    description,
    url: `${SITE_URL}${href}`,
    genre: menu.category,
    gamePlatform: 'Web Browser',
    applicationCategory: 'Game',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    inLanguage: ['ko', 'en'],
  };
}
