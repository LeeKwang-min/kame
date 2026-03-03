import type { MetadataRoute } from 'next';
import { MENU_LIST } from '@/lib/config';
import { SITE_URL } from '@/lib/constants';

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    ...MENU_LIST.map((menu) => ({
      url: `${SITE_URL}${menu.href}`,
      lastModified: new Date(),
      changeFrequency: 'monthly' as const,
      priority: menu.category === 'Utility' ? 0.6 : 0.8,
    })),
  ];
}
