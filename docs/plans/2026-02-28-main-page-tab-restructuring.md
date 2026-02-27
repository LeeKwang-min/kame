# Main Page Tab Restructuring Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 메인 화면을 상단 하이브리드 배너 + 카테고리 탭 구조로 리팩토링하여 광고/공지 영역 확보 및 게임 탐색 UX 개선

**Architecture:** 기존 컴포넌트 리팩토링 방식. FeaturedCarousel → MainBanner(하이브리드 배너), MainCategorySelect → MainCategoryTabs(필 탭 바)로 교체. MainSection에서 탭/검색 상태를 관리하고, MainMenuList가 탭에 따라 그룹핑/플랫 그리드를 전환.

**Tech Stack:** Next.js, React, Tailwind CSS, Lucide React, Shadcn/ui, TanStack Query

**Design Doc:** `docs/plans/2026-02-28-main-page-tab-restructuring-design.md`

---

### Task 1: Add TBannerItem type and i18n keys

**Files:**
- Modify: `@types/menus.ts`
- Modify: `lib/i18n/locales/ko.ts`
- Modify: `lib/i18n/locales/en.ts`

**Step 1: Add TBannerItem type to `@types/menus.ts`**

After the existing `TFeaturedGame` type, add:

```typescript
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
```

**Step 2: Add `featured` key to category translations**

In `lib/i18n/locales/ko.ts`, add `featured: string` to the `category` type definition, and `featured: '추천'` to `ko.category`.

In `lib/i18n/locales/en.ts`, add `featured: 'Featured'` to `en.category`.

**Step 3: Verify build**

Run: `yarn build` (or `yarn dev` and check no TS errors)

**Step 4: Commit**

```bash
git add @types/menus.ts lib/i18n/locales/ko.ts lib/i18n/locales/en.ts
git commit -m "feat: add TBannerItem type and featured category translation key"
```

---

### Task 2: Add BANNER_ITEMS and CATEGORY_TABS config

**Files:**
- Modify: `lib/config.ts`

**Step 1: Add BANNER_ITEMS array**

After `FEATURED_GAMES`, add the `BANNER_ITEMS` array. Import `TBannerItem` from `@/@types/menus`.

```typescript
import { TBannerItem, TFeaturedGame, TMenu } from '@/@types/menus';

export const BANNER_ITEMS: TBannerItem[] = [
  {
    type: 'card',
    icon: '🎮',
    bgColor: 'from-cyan-900/50 to-purple-900/50',
    title: { kor: '새로운 게임 출시!', eng: 'New Game Released!' },
    description: {
      kor: 'Random Defense가 추가되었습니다',
      eng: 'Random Defense has been added',
    },
    href: '/randomdefense',
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
```

**Step 2: Add CATEGORY_TABS array**

No additional imports needed (icons will be imported in the component). This is a data-only config:

```typescript
export const CATEGORY_TABS = [
  { id: 'ALL', iconName: 'Dice5' as const },
  { id: 'FEATURED', iconName: 'Star' as const },
  { id: 'Arcade', iconName: 'Dice5' as const },
  { id: 'Action', iconName: 'Gamepad2' as const },
  { id: 'Puzzle', iconName: 'Puzzle' as const },
  { id: 'Reflex', iconName: 'Zap' as const },
  { id: 'Good Luck', iconName: 'Clover' as const },
  { id: 'Utility', iconName: 'Wrench' as const },
] as const;
```

**Step 3: Commit**

```bash
git add lib/config.ts
git commit -m "feat: add BANNER_ITEMS and CATEGORY_TABS configuration"
```

---

### Task 3: Create MainBanner component

**Files:**
- Create: `app/(main)/_components/MainBanner.tsx`

**Step 1: Implement MainBanner**

This replaces FeaturedCarousel. Key differences:
- Width 100%, no left/right arrow buttons
- Renders hybrid TBannerItem types (image/card/announcement)
- Height: desktop 200px, mobile 160px
- Auto-rotation 5s, pause on hover
- Dot indicators at bottom center

```typescript
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useLocale } from '@/provider/LocaleProvider';
import { BANNER_ITEMS } from '@/lib/config';
import { TBannerItem } from '@/@types/menus';

function MainBanner() {
  const { locale } = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const total = BANNER_ITEMS.length;

  const goTo = useCallback(
    (index: number) => {
      if (isTransitioning || total === 0) return;
      setIsTransitioning(true);
      setCurrentIndex(((index % total) + total) % total);
      setTimeout(() => setIsTransitioning(false), 400);
    },
    [total, isTransitioning],
  );

  const goNext = useCallback(() => {
    goTo(currentIndex + 1);
  }, [currentIndex, goTo]);

  useEffect(() => {
    if (isPaused || total <= 1) return;
    timeoutRef.current = setTimeout(goNext, 5000);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [currentIndex, isPaused, goNext, total]);

  if (total === 0) return null;

  const item = BANNER_ITEMS[currentIndex];
  const title = locale === 'ko' ? item.title.kor : item.title.eng;
  const description =
    locale === 'ko' ? item.description.kor : item.description.eng;

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <BannerSlide
        item={item}
        title={title}
        description={description}
        locale={locale}
      />

      {/* Dot indicators */}
      {total > 1 && (
        <div className="flex items-center justify-center gap-2 mt-3">
          {BANNER_ITEMS.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                i === currentIndex
                  ? 'bg-arcade-cyan w-6'
                  : 'bg-arcade-text/30 hover:bg-arcade-text/50 w-2',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface BannerSlideProps {
  item: TBannerItem;
  title: string;
  description: string;
  locale: string;
}

function BannerSlide({ item, title, description, locale }: BannerSlideProps) {
  const content = (
    <div
      className={cn(
        'relative w-full rounded-xl overflow-hidden',
        'h-[160px] lg:h-[200px]',
        'transition-all duration-400',
        'border border-arcade-border',
      )}
    >
      {/* Background */}
      {item.type === 'image' ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${item.src})` }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>
      ) : (
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-r',
            item.bgColor,
          )}
        />
      )}

      {/* Content */}
      <div className="relative z-10 h-full flex items-center px-6 lg:px-10">
        <div className="flex flex-col gap-2">
          {/* Badge for announcements */}
          {item.type === 'announcement' && item.badge && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-arcade-cyan/20 text-arcade-cyan border border-arcade-cyan/30 w-fit">
              {locale === 'ko' ? item.badge.kor : item.badge.eng}
            </span>
          )}

          {/* Icon for card type */}
          {item.type === 'card' && (
            <span className="text-3xl lg:text-4xl">{item.icon}</span>
          )}

          <h2 className="text-lg lg:text-2xl font-bold text-white">
            {title}
          </h2>
          <p className="text-sm lg:text-base text-white/70 max-w-md">
            {description}
          </p>

          {/* CTA Button */}
          {(item.type === 'image' || item.type === 'card') &&
            item.ctaText && (
              <span
                className={cn(
                  'inline-flex items-center gap-1 px-4 py-1.5 mt-1',
                  'rounded-lg text-sm font-bold',
                  'bg-arcade-cyan/20 text-arcade-cyan',
                  'border border-arcade-cyan/30',
                  'hover:bg-arcade-cyan/30 transition-colors',
                  'w-fit',
                )}
              >
                {locale === 'ko' ? item.ctaText.kor : item.ctaText.eng}
                <span className="text-xs">→</span>
              </span>
            )}
        </div>
      </div>
    </div>
  );

  // Wrap in Link if href exists
  if ((item.type === 'image' || item.type === 'card') && item.href) {
    return <Link href={item.href}>{content}</Link>;
  }

  return content;
}

export default MainBanner;
```

**Step 2: Commit**

```bash
git add app/(main)/_components/MainBanner.tsx
git commit -m "feat: create MainBanner hybrid carousel component"
```

---

### Task 4: Create MainCategoryTabs component

**Files:**
- Create: `app/(main)/_components/MainCategoryTabs.tsx`

**Step 1: Implement MainCategoryTabs**

```typescript
'use client';

import { Dispatch, SetStateAction } from 'react';
import {
  Clover,
  Dice5,
  Gamepad2,
  LucideIcon,
  Puzzle,
  Star,
  Wrench,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocale } from '@/provider/LocaleProvider';

const TAB_ICONS: Record<string, LucideIcon> = {
  Dice5,
  Star,
  Gamepad2,
  Puzzle,
  Zap,
  Clover,
  Wrench,
};

const TABS = [
  { id: 'ALL', iconName: 'Dice5', labelKey: 'all' as const },
  { id: 'FEATURED', iconName: 'Star', labelKey: 'featured' as const },
  { id: 'Arcade', iconName: 'Dice5', labelKey: 'arcade' as const },
  { id: 'Action', iconName: 'Gamepad2', labelKey: 'action' as const },
  { id: 'Puzzle', iconName: 'Puzzle', labelKey: 'puzzle' as const },
  { id: 'Reflex', iconName: 'Zap', labelKey: 'reflex' as const },
  { id: 'Good Luck', iconName: 'Clover', labelKey: 'goodLuck' as const },
  { id: 'Utility', iconName: 'Wrench', labelKey: 'utility' as const },
];

interface IProps {
  category: string;
  setCategory: Dispatch<SetStateAction<string>>;
}

function MainCategoryTabs({ category, setCategory }: IProps) {
  const { t } = useLocale();

  return (
    <div className="w-full overflow-x-auto scrollbar-hide">
      <div className="flex items-center gap-1 min-w-max border-b border-arcade-border">
        {TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.iconName];
          const isActive = category === tab.id;
          const label = t.category[tab.labelKey];

          return (
            <button
              key={tab.id}
              onClick={() => setCategory(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium',
                'transition-all duration-200 relative whitespace-nowrap',
                isActive
                  ? 'text-arcade-cyan'
                  : 'text-arcade-text/50 hover:text-arcade-text/80',
              )}
            >
              {Icon && <Icon size={16} />}
              {label}
              {/* Active underline */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-arcade-cyan rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MainCategoryTabs;
```

**Step 2: Commit**

```bash
git add app/(main)/_components/MainCategoryTabs.tsx
git commit -m "feat: create MainCategoryTabs pill tab bar component"
```

---

### Task 5: Update MainMenuList for tab mode

**Files:**
- Modify: `app/(main)/_components/MainMenuList.tsx`

**Step 1: Add FEATURED tab support**

The component needs to handle a new `category` value `'FEATURED'`. When `category === 'FEATURED'`, it should:
1. Call the API with `category='ALL'` (fetch all games)
2. Filter results client-side to only show games in `FEATURED_GAMES`
3. Display as flat grid (no category grouping)

For non-ALL/non-FEATURED tabs, the API already returns only that category, and we display as flat grid (no category heading).

Changes to `MainMenuList`:
- Import `FEATURED_GAMES` from `@/lib/config`
- When `category === 'FEATURED'`:
  - Pass `'ALL'` to `useGetMenus` instead of `'FEATURED'`
  - Filter the flattened result to only include games whose `href` is in `FEATURED_GAMES`
  - Render flat grid
- When `category === 'ALL'`:
  - Keep current behavior (grouped by category with headings)
- When category is a specific category (Arcade, Action, etc.):
  - Render flat grid (no category heading since it's redundant)

```typescript
'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { useGetMenus } from '@/service/menus';
import {
  Binary,
  BookText,
  Clover,
  Dice5,
  Film,
  Gamepad2,
  Puzzle,
  UserRoundSearch,
  Webhook,
  Wrench,
  Zap,
} from 'lucide-react';
import GameCard from '@/components/common/GameCard';
import { cn } from '@/lib/utils';
import { FEATURED_GAMES } from '@/lib/config';
import { TMenu } from '@/@types/menus';

export const CATEGORY_ICON = {
  Arcade: <Dice5 size={18} className="text-arcade-cyan" />,
  Action: <Gamepad2 size={18} className="text-arcade-yellow" />,
  Puzzle: <Puzzle size={18} className="text-arcade-magenta" />,
  Reflex: <Zap size={18} className="text-arcade-cyan" />,
  'Good Luck': <Clover size={18} className="text-arcade-yellow" />,
  Utility: <Wrench size={18} className="text-arcade-magenta" />,
  Fun: <Gamepad2 size={18} className="text-arcade-cyan" />,
  Content: <BookText size={18} className="text-arcade-cyan" />,
  Development: <Binary size={18} className="text-arcade-cyan" />,
  Media: <Film size={18} className="text-arcade-cyan" />,
  About: <UserRoundSearch size={18} className="text-arcade-cyan" />,
  'Web APIs': <Webhook size={18} className="text-arcade-cyan" />,
};

const featuredHrefs = new Set(FEATURED_GAMES.map((f) => f.href));

interface IProps {
  keyword: string;
  category: string;
  isMobile: boolean;
}

function MainMenuList({ keyword, category, isMobile }: IProps) {
  // FEATURED tab: fetch all, then filter client-side
  const apiCategory = category === 'FEATURED' ? 'ALL' : category;
  const { data: menus, isLoading } = useGetMenus(keyword, apiCategory, isMobile);

  if (isLoading) return <MainMenuListSkeleton />;

  const categories = Object.keys(menus || {});
  if (categories.length === 0) return <MainMenuListEmpty />;

  // FEATURED tab: flatten all categories, filter by FEATURED_GAMES
  if (category === 'FEATURED') {
    const allMenus: TMenu[] = categories.flatMap((cat) => menus?.[cat] || []);
    const featuredMenus = allMenus.filter((menu) => featuredHrefs.has(menu.href));
    if (featuredMenus.length === 0) return <MainMenuListEmpty />;

    return (
      <div className="w-full grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {featuredMenus.map((menu) => (
          <GameCard key={menu.name.eng} menu={menu} />
        ))}
      </div>
    );
  }

  // Specific category tab (not ALL): flat grid, no category heading
  if (category !== 'ALL') {
    const allMenus: TMenu[] = categories.flatMap((cat) => menus?.[cat] || []);
    return (
      <div className="w-full grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {allMenus.map((menu) => (
          <GameCard key={menu.name.eng} menu={menu} />
        ))}
      </div>
    );
  }

  // ALL tab: grouped by category (existing behavior)
  return (
    <div className="w-full flex flex-col gap-8">
      {categories.map((cat) => (
        <div key={cat} className="w-full flex flex-col gap-3">
          <h3
            className={cn(
              'font-bold flex items-center gap-2',
              'text-arcade-text text-lg',
              'pb-2 border-b border-arcade-border',
            )}
          >
            {CATEGORY_ICON[cat as keyof typeof CATEGORY_ICON]}
            {cat}
          </h3>
          <div className="w-full grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {menus?.[cat]?.map((menu) => (
              <GameCard key={menu.name.eng} menu={menu} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MainMenuList;

function MainMenuListSkeleton() {
  return (
    <div className="w-full flex flex-col gap-8">
      {new Array(3).fill(0).map((_, idx) => (
        <div key={`category-${idx}`} className="w-full flex flex-col gap-3">
          <Skeleton className="h-6 w-[160px] bg-arcade-border" />
          <div className="w-full grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {new Array(6).fill(0).map((_, index) => (
              <Skeleton
                key={`menu-${index}`}
                className="aspect-square w-full rounded-lg bg-arcade-surface"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MainMenuListEmpty() {
  return (
    <div className="w-full flex flex-col gap-2 items-center justify-center h-full min-h-[250px]">
      <p className="text-center text-sm text-arcade-text/50 font-bold">
        검색 결과가 없습니다.
      </p>
      <p className="text-center text-sm text-arcade-text/50 font-bold">
        No menus found
      </p>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add app/(main)/_components/MainMenuList.tsx
git commit -m "feat: update MainMenuList to support tab mode (flat grid vs grouped)"
```

---

### Task 6: Update MainSection and wire everything together

**Files:**
- Modify: `app/(main)/_components/MainSection.tsx`
- Modify: `app/(main)/_components/MainSearchBar.tsx`

**Step 1: Update MainSearchBar to notify on search change**

Add an `onSearchChange` callback prop so MainSection can reset category to 'ALL' when the user types:

```typescript
// MainSearchBar.tsx - add onSearchChange prop
interface IProps {
  search: string;
  setSearch: Dispatch<SetStateAction<string>>;
  onSearchChange?: () => void;
}

// In the useEffect debounce handler:
useEffect(() => {
  const timer = setTimeout(() => {
    setSearch(debouncedSearch);
    if (debouncedSearch && onSearchChange) {
      onSearchChange();
    }
  }, 500);
  return () => clearTimeout(timer);
}, [debouncedSearch, setSearch, onSearchChange]);
```

**Step 2: Update MainSection**

Replace FeaturedCarousel with MainBanner, MainCategorySelect with MainCategoryTabs. Add tab↔search interaction logic.

```typescript
'use client';
import { useState, useCallback } from 'react';
import MainMenuList from './MainMenuList';
import MainSearchBar from './MainSearchBar';
import MainCategoryTabs from './MainCategoryTabs';
import LoginSidebar from '@/components/auth/LoginSidebar';
import MainBanner from './MainBanner';
import { useIsMobile } from '@/hooks/use-mobile';

function MainSection() {
  const [search, setSearch] = useState<string>('');
  const [category, setCategory] = useState<string>('ALL');
  const isMobile = useIsMobile();

  // When user types in search, auto-switch to ALL tab
  const handleSearchChange = useCallback(() => {
    setCategory('ALL');
  }, []);

  // When user clicks a tab, clear search
  const handleCategoryChange = useCallback(
    (newCategory: string | ((prev: string) => string)) => {
      setCategory(newCategory);
      setSearch('');
    },
    [],
  );

  return (
    <div className="flex gap-6 grow">
      <LoginSidebar className="hidden lg:flex" />
      <div className="flex flex-col gap-4 grow">
        <MainBanner />
        <MainSearchBar
          search={search}
          setSearch={setSearch}
          onSearchChange={handleSearchChange}
        />
        <MainCategoryTabs
          category={category}
          setCategory={handleCategoryChange}
        />
        <MainMenuList keyword={search} category={category} isMobile={isMobile} />
      </div>
    </div>
  );
}

export default MainSection;
```

**Step 3: Commit**

```bash
git add app/(main)/_components/MainSection.tsx app/(main)/_components/MainSearchBar.tsx
git commit -m "feat: wire MainSection with MainBanner, MainCategoryTabs, and search-tab interaction"
```

---

### Task 7: Delete old components

**Files:**
- Delete: `app/(main)/_components/FeaturedCarousel.tsx`
- Delete: `app/(main)/_components/MainCategorySelect.tsx`

**Step 1: Delete FeaturedCarousel.tsx**

```bash
rm app/(main)/_components/FeaturedCarousel.tsx
```

**Step 2: Delete MainCategorySelect.tsx**

```bash
rm app/(main)/_components/MainCategorySelect.tsx
```

**Step 3: Verify no remaining imports**

Search the codebase for any remaining imports of these files:
- `FeaturedCarousel`
- `MainCategorySelect`

If found, remove/update them.

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor: remove FeaturedCarousel and MainCategorySelect (replaced by MainBanner and MainCategoryTabs)"
```

---

### Task 8: Add scrollbar-hide utility and verify

**Files:**
- Possibly modify: `app/globals.css` (if scrollbar-hide class doesn't exist)

**Step 1: Check if scrollbar-hide exists**

Search `globals.css` for `scrollbar-hide`. If not present, add:

```css
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
```

**Step 2: Run dev server and verify**

Run: `yarn dev`

Verify:
1. Banner displays with auto-rotation, dot indicators, no arrows
2. Search bar is below banner, above tabs
3. Tab bar shows all 8 tabs with icons
4. '전체' tab shows grouped by category
5. '추천' tab shows only featured games as flat grid
6. Category tabs show only that category's games as flat grid
7. Typing in search auto-switches to '전체' tab
8. Clicking a tab clears search
9. Mobile: tabs scroll horizontally
10. Mobile: banner is 160px height

**Step 3: Commit**

```bash
git add app/globals.css
git commit -m "feat: add scrollbar-hide utility for mobile tab scrolling"
```

---

### Task 9: Use frontend-design skill to polish visuals

**Step 1: Invoke frontend-design skill**

Use the `frontend-design` skill to review and polish:
- Banner visual styling (gradients, typography, spacing)
- Tab bar active/hover states
- Smooth transitions between tabs
- Mobile responsiveness
- Consistency with existing arcade theme

**Step 2: Apply visual polish and commit**

```bash
git add -A
git commit -m "style: polish MainBanner and MainCategoryTabs visual design"
```

---

### Task 10: Final verification and cleanup

**Step 1: Full build check**

Run: `yarn build`
Expected: No TypeScript errors, no build failures.

**Step 2: Visual verification**

Check all pages still work:
- Main page (desktop + mobile)
- All tab switching
- Search interaction
- Banner auto-rotation
- Banner item links work

**Step 3: Final commit if needed**

```bash
git add -A
git commit -m "chore: final cleanup for main page tab restructuring"
```
